const axios = require('axios');

const API_KEY = process.env.MOVIE_API_KEY
const BASE_URL = "https://api.themoviedb.org"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async function queryDirectorByName(name) {
    //https://api.themoviedb.org/3/search/person?api_key=<<api_key>>&language=en-US&query=test&page=1&include_adult=false
    const url = new URL("/3/search/person", BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    url.searchParams.append("query", name)
    url.searchParams.append("page", "1")
    url.searchParams.append("include_adult", "false")

    const result = await axios.get(url.toString())
    const searchResult = result.data
    const director = searchResult?.results?.[0] || {}
    if (searchResult?.total_results != 0) {
        return director
    } else {
        return {}
    }
}

async function queryMovieByName(name) {
    const url = new URL("/3/search/movie", BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    url.searchParams.append("query", name)
    url.searchParams.append("page", "1")
    url.searchParams.append("include_adult", "false")

    const result = await axios.get(url.toString())
    const searchResult = result.data
    const currMovie = searchResult?.results?.[0] || {}
    if (searchResult?.total_results != 0) {
        return currMovie
    } else {
        return {}
    }
}

async function queryMovieById(id) {
    const url = new URL(`/3/movie/${id}`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    try {
        const result = await axios.get(url.toString())
        const searchResult = result.data
        return searchResult
    }
    catch (e) {
        return {}
    }
}

async function queryMovieCrewById(id) {
    const url = new URL(`/3/movie/${id}/credits`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)

    try {
        const result = await axios.get(url.toString())
        const searchResult = result.data
        return searchResult
    } catch {
        return {}
    }
}

async function queryMovieImagesById(id) {
    const url = new URL(`/3/movie/${id}/images`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)

    try {
        const result = await axios.get(url.toString())
        const { backdrops } = result.data
        return backdrops
    }
    catch (e) {
        return {}
    }
}

async function getUrlImageToBuffer(url) {
    let image = await axios.get(url, { responseType: 'arraybuffer' });
    let returnedB64 = Buffer.from(image.data);

    return returnedB64
}

function mergeNames(names) {
    if (names?.length) {
        const resNames = names.reduce((val, curr, currentIndex) => {
            const separator = currentIndex > 0 && currentIndex != names.length - 1 ? ", " : " & "
            return `${val}${currentIndex == 0 ? "" : separator}${curr.name}`
        }, "")
        return resNames
    } else {
        return ""
    }
}

function getMusicComposer(cast) {
    const director = cast.crew.filter(c => c.job == "Original Music Composer")
    return mergeNames(director)
}

function getDirector(cast) {
    const director = cast.crew.filter(c => c.job == "Director")
    return mergeNames(director)
}

function getDirectorOfPhotography(cast) {
    const directorPhotography = cast.crew.filter(c => c.job == "Director of Photography")
    return mergeNames(directorPhotography)
}

//

function getTopImages(images, top = 3) {
    const topImages = []

    const getLowestRatedTopImage = () => {
        let index = 0
        let lowest = topImages[0] || { vote_count: 0 }
        topImages.forEach((tp, indexval) => {
            if (lowest.vote_count > tp.vote_count) {
                lowest = tp
                index = indexval
            }
        })
        return index
    }

    images?.forEach(im => {
        if (topImages.length == 0) {
            topImages.push(im)
        } else if (topImages.length < top) {
            topImages.push(im)
        } else {
            const lowestIndex = getLowestRatedTopImage()
            if (topImages?.[lowestIndex]?.vote_count > im.vote_count) {
                topImages[lowestIndex] = im
            }
        }
    })

    topImages.sort((a, b) => a.vote_count - b.vote_count)
    const topImagesUrl = topImages.map(ti => `${IMAGE_BASE_URL}${ti.file_path}`)

    return topImagesUrl
}

function getBestImage(images) {
    let image = { vote_count: 0 }
    images?.forEach(im => {
        if (image.vote_count < im.vote_count) {
            image = im
        }
    })
    return image
}

async function getKnownForMoviesByDirector(director) {
    const { known_for } = director
    const backdrops = []
    const movies = known_for.map(kf => {
        if (backdrops.length < 3) {
            backdrops.push(`${IMAGE_BASE_URL}${kf.backdrop_path}`)
        }
        const releaseDate = kf?.release_date?.split("-")?.[0]
        return {
            id: kf.id,
            title: kf.title,
            release: releaseDate
        }
    })

    const backdropsBuffer = await Promise.all(backdrops.map(getUrlImageToBuffer))

    return { backdropsBuffer, movies }
}

async function getDirectorObject(director) {
    const { movies, backdropsBuffer } = await getKnownForMoviesByDirector(director)
    return {
        id: director.id,
        name: director.name,
        original_title: director.name,
        movies,
        movie_images: backdropsBuffer
    }
}

async function getMoviePostObject(movie) {
    const crew = await queryMovieCrewById(movie.id)
    const directorName = getDirector(crew)
    const directorOfPhotography = getDirectorOfPhotography(crew)
    const composers = getMusicComposer(crew)

    const images = await queryMovieImagesById(movie.id)
    const bestImage = getBestImage(images)
    const poster_path = bestImage?.file_path ?? movie.poster_path

    const getYearFromReleaseDate = (date) => {
        return date?.split("-")?.[0]
    }

    const posterBuffer = await getUrlImageToBuffer(`${IMAGE_BASE_URL}${poster_path}`)
    const original_poster = await getUrlImageToBuffer(`${IMAGE_BASE_URL}${movie.poster_path}`)
    const vote_average = parseFloat(movie.vote_average).toFixed(1)
    return {
        id: movie.id,
        original_title: movie.title,
        overview: movie.overview,
        // tagline: movie.tagline,
        poster_path: posterBuffer,
        original_poster,
        title: movie.title,
        vote_average,
        release: getYearFromReleaseDate(movie.release_date),
        directorName,
        directorOfPhotography,
        composers
    }
}

async function getMovieByName(name) {
    const movie = await queryMovieByName(name)
    const movieObject = await getMoviePostObject(movie)
    return movieObject
}

async function getMovieById(id) {
    const movie = await queryMovieById(id)
    const movieObject = await getMoviePostObject(movie)
    return movieObject
}

async function getDirectorByName(name) {
    const director = await queryDirectorByName(name)
    const directorObject = await getDirectorObject(director)
    return directorObject
}

async function makeMovieRequest({ name = "", id = "" }) {
    console.log(name)
    const movie = id ? await getMovieById(id) : await getMovieByName(name)
    const value = {
        ...movie,
        images: [movie?.poster_path]
    }
    return value
}

async function makeCinematographyRequest({ name = "", id = "", images = [] }) {
    const movie = id ? await getMovieById(id) : await getMovieByName(name)
    const movieImages = images.length ? images : getTopImages(await queryMovieImagesById(movie.id))
    const imageBuffer = await Promise.all(movieImages.map(getUrlImageToBuffer))
    const value = {
        ...movie,
        images: imageBuffer
    }
    return value
}

async function makeOriginalSoundtrackRequest({ name = "", id = "", spotify }) {
    const movie = id ? await getMovieById(id) : await getMovieByName(name)
    const value = {
        images: [movie?.poster_path],
        spotify,
        ...movie,
    }
    return value
}

async function makeDirectorRequest({ name = "", id = "" }) {
    console.log({ name, id })
    const data = await getDirectorByName(name)
    return data
}

module.exports = { makeMovieRequest, makeCinematographyRequest, makeOriginalSoundtrackRequest, makeDirectorRequest }

//tagline missing



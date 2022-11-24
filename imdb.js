const axios = require('axios');

const API_KEY = process.env.MOVIE_API_KEY
const BASE_URL = "https://api.themoviedb.org"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async function getMovieDataById(id) {
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

async function getImages(id) {
    // /movie/{movie_id}/images
    const url = new URL(`/3/movie/${id}/images`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)

    try {
        const result = await axios.get(url.toString())
        const searchResult = result.data
        return searchResult
    }
    catch (e) {
        return {}
    }
}

function getTopFourImages(images) {
    const topFour = []

    const getLowestRatedImage = () => {
        let index = 0
        let lowest = topFour[0] || { vote_count: 0 }
        topFour.forEach((tp, indexval) => {
            if (lowest.vote_count > tp.vote_count) {
                lowest = tp
                index = indexval
            }
        })
        return index
    }

    images?.forEach(im => {
        if (topFour.length == 0) {
            topFour.push(im)
        } else if (topFour.length < 4) {
            topFour.push(im)
        } else {
            const lowestIndex = getLowestRatedImage()
            if (topFour?.[lowestIndex]?.vote_count > im.vote_count) {
                topFour[lowestIndex] = im
            }
        }
    })

    return topFour
}

function getBestImage(images) {
    let image = { vote_count: 0 }
    images?.forEach(im => {
        if (image.vote_count < im.vote_count) {
            image = im
        }
    })
    return image ?? ""
}

async function getTwitterImage(id, getAllImages = false) {
    const { backdrops } = await getImages(id)
    if (getAllImages) {
        return backdrops
    }
    if (backdrops) {
        const bestImage = getBestImage(backdrops)
        return bestImage?.file_path
    }
    return ""
}

async function getImageFromURL(url) {
    let image = await axios.get(url, { responseType: 'arraybuffer' });
    let returnedB64 = Buffer.from(image.data);

    return returnedB64
}

async function getCrew(id) {
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

function getDirector(cast) {
    const director = cast.crew.filter(c => c.job == "Director")
    return mergeNames(director)
}

function getDirectorOfPhotography(cast) {
    const directorPhotography = cast.crew.filter(c => c.job == "Director of Photography")
    return mergeNames(directorPhotography)
}

async function queryMovieById(id) {
    const movie = await getMovieDataById(id)
    const retMovie = await generateTweetMovieObject(movie)
    return retMovie
}

async function getMovieByName(name, twitterObject = true) {
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

        if (twitterObject) {
            return await generateTweetMovieObject(currMovie)
        }
        else {
            return currMovie
        }
    } else {
        return {}
    }
}


async function generateTweetMovieObject(currMovie, isById = false) {
    try {
        const movieData = isById ? currMovie : await getMovieDataById(currMovie.id)
        const cast = await getCrew(currMovie.id)
        const directorName = getDirector(cast)
        const image = await getTwitterImage(currMovie.id)

        const poster_path = image ?? currMovie.poster_path

        const movieResult = {
            id: currMovie.id,
            original_title: movieData.title,
            overview: movieData.overview,
            tagline: movieData.tagline,
            poster_path: `${IMAGE_BASE_URL}${poster_path}`,
            title: currMovie.title,
            vote_average: currMovie.vote_average,
            release: movieData.release_date,
            directorName
        }
        return movieResult

    } catch {
        return {}
    }
}

async function getCinematography(movieName = "", id = "") {
    const movie = id ? await queryMovieById(id) : await getMovieByName(movieName)
    // console.log({ movie })
    const images = await getTwitterImage(movie.id, true)
    const crew = await getCrew(movie.id)
    const directorOfPhotography = getDirectorOfPhotography(crew)

    let topFour = getTopFourImages(images)
    topFour.sort((a, b) => a.vote_count - b.vote_count)

    const topFourImages = topFour.map(tf => `${IMAGE_BASE_URL}${tf.file_path}`)

    return {
        topFourImages, directorOfPhotography, movie
    }
}

module.exports = { getMovieByName, getImageFromURL, queryMovieById, getCinematography };
const axios = require('axios');

const API_KEY = process.env.MOVIE_API_KEY
const BASE_URL = "https://api.themoviedb.org"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async function queryDirectorByName(name) {
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

async function queryPersonById(id) {
    const url = new URL(`/3/person/${id}`, BASE_URL)
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

async function queryPersonByName(name) {
    const url = new URL("/3/search/person", BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    url.searchParams.append("query", name)
    url.searchParams.append("page", "1")
    url.searchParams.append("include_adult", "false")
    const result = await axios.get(url.toString())
    const searchResult = result.data
    const currPerson = searchResult?.results?.[0] || {}

    if (searchResult?.total_results != 0) {
        return currPerson
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

async function queryMovieImagesById(id, includePoster = false) {
    const url = new URL(`/3/movie/${id}/images`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)

    try {
        const result = await axios.get(url.toString())
        const { backdrops, posters } = result.data
        return includePoster ? { posters, backdrops } : backdrops
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

function compareTwoImages(imageA, imageB) {
    const isOverAllABetterImage = imageA.vote_count < imageB.vote_count && imageA.vote_average < imageB.vote_average
    const isMoreVoted = imageA.vote_average < imageB.vote_average
    const isLowestRated = imageA.vote_average > imageB.vote_average
    return { isOverAllABetterImage, isMoreVoted, isLowestRated }
}

function getTopImages(images, top = 3) {
    const topImages = []

    const getLowestRatedTopImage = () => {
        let index = 0
        let lowest = topImages[0] || { vote_count: 0 }
        topImages.forEach((tp, indexval) => {
            const { isLowestRated } = compareTwoImages(lowest, tp)
            if (isLowestRated) {
                lowest = tp
                index = indexval
            }
        })
        return index
    }

    images?.forEach(im => {
        if (topImages.length < top) {
            topImages.push(im)
        } else {
            const lowestIndex = getLowestRatedTopImage()
            const { isOverAllABetterImage } = compareTwoImages(topImages?.[lowestIndex], im)
            if (isOverAllABetterImage) {
                topImages[lowestIndex] = im
            }
        }
    })

    topImages.sort((a, b) => a.vote_count - b.vote_count)
    const topImagesUrl = topImages.map(ti => `${IMAGE_BASE_URL}${ti.file_path}`)

    return topImagesUrl
}

function getBestImage(images) {
    let image = { vote_count: 0, vote_average: 0 }
    images?.forEach(im => {
        const { isOverAllABetterImage } = compareTwoImages(image, im)
        if (isOverAllABetterImage) {
            image = im
        }
    })
    return image
}

async function getKnownForMoviesByPerson(person, buffer = true) {
    const { known_for } = person
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

    const backdropsBuffer = buffer ? await Promise.all(backdrops.map(getUrlImageToBuffer)) : backdrops

    return { backdropsBuffer, movies }
}

async function generateFeaturedPersonMovies(person, movies = []) {
    if (movies.length) {
        const moviesQuery = movies.map(mov => mov.id ? queryMovieById(mov.id) : queryMovieByName(mov.name))
        const moviesRaw = await Promise.all(moviesQuery)

        const movieImageObjectComplete = moviesRaw.map((m, index) => ({ userMovie: movies[index], ...m }))

        const imageWithData = []

        for await (const mov of movieImageObjectComplete) {
            // console.log(mov)
            const imgObject = { name: mov.title, id: mov.id, overview: mov.overview, image: "" }
            if (mov?.userMovie?.image) {
                const image = mov?.userMovie?.image
                imageWithData.push({ ...imgObject, image })
                continue
            }
            const images = await queryMovieImagesById(mov.id)
            const bestImageDB = getBestImage(images)
            imageWithData.push({ ...imgObject, image: `${IMAGE_BASE_URL}${bestImageDB?.file_path}` })
        }

        return imageWithData
    } else if (person.known_for) {
        const { backdropsBuffer: backdrops } = await getKnownForMoviesByPerson(person, false)
        return backdrops.map((bd, index) => {
            const { id, title, overview } = person.known_for[index]
            return { image: bd, id, name: title, overview }
        })
    }
}

async function getFeaturedPersonObject(person, movies = []) {
    const movieImages = await generateFeaturedPersonMovies(person, movies)
    return {
        id: person.id,
        name: person.name,
        movies: movieImages
    }
}

async function getDirectorObject(director, movies = []) {
    const backdropsBuffer = await getKnownForMoviesByPerson(director)
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

    const { backdrops: images, posters } = await queryMovieImagesById(movie.id, true)

    const bestImage = getBestImage(images)
    const poster_path = bestImage?.file_path ?? movie.poster_path

    const getYearFromReleaseDate = (date) => {
        return date?.split("-")?.[0]
    }

    const posterBuffer = await getUrlImageToBuffer(`${IMAGE_BASE_URL}${poster_path}`)
    const bestPoster = getBestImage(posters)
    const original_poster = await getUrlImageToBuffer(`${IMAGE_BASE_URL}${bestPoster.file_path}`)
    const vote_average = parseFloat(movie.vote_average).toFixed(1)
    return {
        id: movie.id,
        original_title: movie.title,
        overview: movie.overview,
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

async function getPersonById(id, movies) {
    const { name } = await queryPersonById(id)
    const person = await queryPersonByName(name)
    const personObject = await getFeaturedPersonObject(person, movies)
    return personObject
}

async function getPersonByName(name, movies) {
    const person = await queryPersonByName(name)
    const personObject = await getFeaturedPersonObject(person, movies)
    return personObject
}

async function getMovieByName(name) {
    const movie = await queryMovieByName(name)
    if (movie) {
        const movieObject = await getMoviePostObject(movie)
        return movieObject
    }
    return {}
}

async function getMovieById(id) {
    const movie = await queryMovieById(id)
    if (movie) {
        const movieObject = await getMoviePostObject(movie)
        return movieObject
    }
    return {}
}

async function getDirectorByName(name, movies = []) {
    console.log("Director", name)
    const director = await queryDirectorByName(name)
    const directorObject = await getDirectorObject(director)
    return directorObject
}

async function makeMovieRequest({ name = "", id = "" }) {
    console.log("List", name)
    const movie = id ? await getMovieById(id) : await getMovieByName(name)
    const value = {
        ...movie,
        images: [movie?.poster_path]
    }
    return value
}

async function makeCinematographyRequest({ name = "", id = "", images = [] }) {
    console.log("Cinematography", name)
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
    console.log("Soundtrack", name)
    const movie = id ? await getMovieById(id) : await getMovieByName(name)
    const value = {
        images: [movie?.poster_path],
        spotify,
        ...movie,
    }
    return value
}

async function makeDirectorRequest({ name = "", id = "", movies = [] }) {
    const data = await getDirectorByName(name)
    return data
}

async function makeFeaturedPersonRequest({ name = "", id = "", featured = [] }) {
    const person = id ? await getPersonById(id, featured) : await getPersonByName(name, featured)
    const personBuffer = await Promise.all(person.movies.map(m => getUrlImageToBuffer(m.image)))
    person.movies = person.movies?.map((pm, index) => {
        return {
            ...pm,
            bufferImage: personBuffer[index]
        }
    })
    return person
}

module.exports = { makeMovieRequest, makeCinematographyRequest, makeOriginalSoundtrackRequest, makeDirectorRequest, makeFeaturedPersonRequest }

//tagline missing



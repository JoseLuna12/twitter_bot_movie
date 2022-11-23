const axios = require('axios');

const API_KEY = "d9929a149452e7e3711bb1ace3e622d9"
const BASE_URL = "https://api.themoviedb.org"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async function getMovieDataById(id) {
    //https://api.themoviedb.org/3/movie/119104?api_key=d9929a149452e7e3711bb1ace3e622d9&language=en-US
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

function getBestImage(images) {
    let image = { vote_count: 0 }
    images?.forEach(im => {
        if (image.vote_count < im.vote_count) {
            image = im
        }
    })
    return image ?? ""
}

async function getTwitterImage(id) {
    const { backdrops } = await getImages(id)
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

function getDirector(cast) {
    const director = cast.crew.filter(c => c.job == "Director")
    if (director?.length) {
        const directorNames = director.reduce((val, curr, currentIndex) => {
            const separator = currentIndex > 0 && currentIndex != director.length - 1 ? ", " : " & "
            return `${val}${currentIndex == 0 ? "" : separator}${curr.name}`
        }, "")
        return directorNames
    }
    return ""
}

async function getMovieByName(name) {
    const url = new URL("/3/search/movie", BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    url.searchParams.append("query", name)
    url.searchParams.append("page", "1")
    url.searchParams.append("include_adult", "false")

    const result = await axios.get(url.toString())
    const searchResult = result.data

    try {
        if (searchResult?.total_results != 0) {
            const currMovie = searchResult?.results?.[0] || {}
            // console.log(JSON.stringify(currMovie))
            const movieData = await getMovieDataById(currMovie.id)
            const cast = await getCrew(currMovie.id)
            const directorName = getDirector(cast)
            const image = await getTwitterImage(currMovie.id)

            const poster_path = image ?? currMovie.poster_path


            const movieResult = {
                id: currMovie.id,
                original_title: currMovie.original_title,
                overview: movieData.overview,
                tagline: movieData.tagline,
                poster_path: `${IMAGE_BASE_URL}${poster_path}`,
                title: currMovie.title,
                vote_average: currMovie.vote_average,
                release: movieData.release_date,
                directorName
            }
            return movieResult
        }
    } catch {
        return {}
    }
}

module.exports = { getMovieByName, getImageFromURL };
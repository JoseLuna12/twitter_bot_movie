
const axios = require('axios');
const API_KEY = process.env.MOVIE_API_KEY
const BASE_URL = "https://api.themoviedb.org"

async function queryMovieImagesById(id) {
    const url = new URL(`/3/movie/${id}/images`, BASE_URL)
    url.searchParams.append("api_key", API_KEY)

    try {
        const result = await axios.get(url.toString())
        return result.data
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
        const value = result.data
        return value
    } catch {
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

async function queryMovieById(id){
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

async function queryPersonByName(name) {
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

module.exports = {queryMovieByName, queryMovieCrewById, queryMovieImagesById, queryMovieById, queryPersonByName}
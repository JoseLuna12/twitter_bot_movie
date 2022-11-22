const API_KEY = "d9929a149452e7e3711bb1ace3e622d9"
const BASE_URL = "https://api.themoviedb.org"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async function getMovieByName(name) {
    const url = new URL("/3/search/movie", BASE_URL)
    url.searchParams.append("api_key", API_KEY)
    url.searchParams.append("language", "en-US")
    url.searchParams.append("query", name)
    url.searchParams.append("page", "1")
    url.searchParams.append("include_adult", "false")
    const result = await fetch(url.toString())
    const searchResult = await result.json()

    if (searchResult) {
        const currMovie = searchResult?.results?.[0] || {}
        const movieResult = {
            id: currMovie.id,
            original_title: currMovie.original_title,
            overview: currMovie.overview,
            poster_path: currMovie.poster_path,
            title: currMovie.title,
            vote_average: currMovie.vote_average
        }
        return movieResult
    }
    return {}
}

module.exports = { getMovieByName };
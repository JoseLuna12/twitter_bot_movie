const {queryMovieByName, queryMovieCrewById, queryMovieImagesById, queryMovieById, queryDirectorByName} = require("./api")
const {getDirector, getDirectorOfPhotography, getMusicComposer, getBestImage, addBaseUrlToImage, getTopImages, getDirectorObject} = require("./util")

async function getCompleteData(movie, images = []){
    const {crew} = await (queryMovieCrewById(movie.id))
    
    const director = getDirector(crew)
    const directorOfPhotography = getDirectorOfPhotography(crew)
    const musicComposer = getMusicComposer(crew)
    const {backdrops, posters} = await queryMovieImagesById(movie.id)
    
    const bestPoster = getBestImage(posters, true)
    const bestBackdrop = getBestImage(backdrops, true)
    const topImages = images.length ? images.map(im => im.url) : getTopImages(backdrops)

    const vote_average = parseFloat(movie.vote_average).toFixed(1)

    const getYearFromReleaseDate = (date) => {
        return date?.split("-")?.[0]
    }

    return {
        ...movie,
        director,
        directorOfPhotography,
        musicComposer,
        bestPoster,
        bestBackdrop,
        vote_average,
        topImages,
        release_date: getYearFromReleaseDate(movie.release_date)
    }

}

async function director({name, id, images}){
    const data = await queryDirectorByName(name)
    const customMoviesPromises = images?.map(mov=> movie(mov, mov.url ?[{url:mov.url}] : [])) 
    const customMovies = await Promise.all(customMoviesPromises)
    const directorMovies = customMovies.map((cm, index) => {
        return {
            id: cm.id,
            title: cm.title,
            release_date: cm.release_date,
            image: images[index]?.url ? images[index]?.url : cm.bestBackdrop
        }
    })
    const director = getDirectorObject(data, directorMovies)
    // return director
    return director
}

async function movie({name, id}, images){
    const data = id ? await queryMovieById(id) : await queryMovieByName(name)

    if(data?.id){
        const {
            id, 
            title, 
            original_title, 
            overview, 
            vote_average, 
            backdrop_path, 
            popularity, 
            release_date,
            poster_path
        } = data
        const movie = {
            id, 
            title, 
            original_title,
            poster_path,
            overview, 
            vote_average, 
            backdrop_path, 
            popularity, 
            release_date
        }
        return await getCompleteData(movie, images)
    }else{
        throw new Error("no movie found")
    }

}

module.exports = {movie, director}
const {queryMovieByName, queryMovieCrewById, queryMovieImagesById, queryMovieById, queryPersonByName} = require("./api")
const {getDirector, getDirectorOfPhotography, getMusicComposer, getBestImage, addBaseUrlToImage, getTopImages, getPersonObject, getKnownForMoviesByPerson} = require("./util")

function completeCharactersData (cast, character){
    if(character.id){
        const char = cast?.find(c => c.id == character.id)
        return char
    }else {
        return null
    }
}

async function getCompleteData(movie, images = [],character = {}){

    const {crew, cast} = await (queryMovieCrewById(movie.id))
    let role = ""

    if(character?.id){
        const characterData = completeCharactersData(cast, character)
        if(characterData?.character){
            role = characterData?.character
        }
    }
    
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
        role,
        release_date: getYearFromReleaseDate(movie.release_date)
    }

}

async function person({name, id, images}){
    const data = await queryPersonByName(name)
    const character = {id: data.id, known_for_department: data.known_for_department}

    const moviesToGet = !images.length ? 
    character.known_for_department == "Acting" ?
    getKnownForMoviesByPerson(data).map(mov => ({...mov, url: mov.image})) : images
    : images

    const customMoviesPromises = moviesToGet?.map(mov=> movie(mov, mov.url ?[{url:mov.url}] : [], character)) 
    const customMovies = await Promise.all(customMoviesPromises)

    const featuringMovies = customMovies?.map((cm, index) => {
        return {
            id: cm.id,
            title: cm.title,
            release_date: cm.release_date,
            role: cm.role,
            overview: cm.overview,
            bestPoster: cm.bestPoster,
            bestBackdrop: cm.bestBackdrop,
            image: images[index]?.url ? images[index]?.url : cm.bestBackdrop
        }
    })
    const person = getPersonObject(data, featuringMovies)
    return person
}

async function movie({name, id}, images, character = {}){
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
            poster_path,
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
            release_date,
        }
        return await getCompleteData(movie, images, character)
    }else{
        throw new Error("no movie found")
    }

}

module.exports = {movie, person}
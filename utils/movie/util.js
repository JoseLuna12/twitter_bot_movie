const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

function addBaseUrlToImage(url){
    return `${IMAGE_BASE_URL}${url}`
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

function getBestImage(images, onlyPath = false) {
    let image = { vote_count: 0, vote_average: 0 }
    images?.forEach(im => {
        const { isOverAllABetterImage } = compareTwoImages(image, im)
        if (isOverAllABetterImage) {
            image = im
        }
    })

    if(onlyPath){
        if(image.file_path){
            return addBaseUrlToImage(image.file_path)
        }else{

            return images?.[0]?.file_path ? addBaseUrlToImage(images?.[0]?.file_path) : null
        }
    }

    if(image.file_path){
        return {...image, file_path: addBaseUrlToImage(image.file_path)}
    }else{
        return {...image, file_path: images?.[0]?.file_path ? addBaseUrlToImage(images?.[0]?.file_path) : null }
    }
}

function getKnownForMoviesByPerson(person) {
    const { known_for } = person
    const movies = known_for.map(kf => {
        const releaseDate = kf?.release_date?.split("-")?.[0]
        return {
            id: kf.id,
            title: kf.title,
            release_date: releaseDate,
            image: `${IMAGE_BASE_URL}${kf.backdrop_path}`
        }
    })

    return movies
}

function getDirectorObject(director, movies = []) {
    const knownFor = movies.length ? movies : getKnownForMoviesByPerson(director)
    return {
        id: director.id,
        name: director.name,
        original_title: director.name,
        movies,
        knownFor
    }
}

function getMusicComposer(cast) {
    const director = cast.filter(c => c.job == "Original Music Composer")
    return mergeNames(director)
}

function getDirector(cast) {
    const director = cast.filter(c => c.job == "Director")
    return mergeNames(director)
}

function getDirectorOfPhotography(cast) {
    const directorPhotography = cast.filter(c => c.job == "Director of Photography")
    return mergeNames(directorPhotography)
}

module.exports = {getMusicComposer, getDirector, getDirectorOfPhotography, getBestImage, addBaseUrlToImage, getTopImages, getDirectorObject}
if (!process.env.PORT) {
    require("dotenv").config();
}
const express = require('express')
var bodyParser = require('body-parser')

const app = express()
var jsonParser = bodyParser.json()

const port = process.env.PORT || 4000;
const { twitterClient, updloadImage } = require("./twitter")
const { getMovieByName, getImageFromURL, queryMovieById, getCinematography, getOriginalSoundtrackDb } = require("./imdb")
const { resumeMovie } = require("./openai")

const tweet = async (content, mediaId) => {
    try {
        await twitterClient.v2.tweet(content, { media: { media_ids: mediaId } });
    } catch (e) {
        console.log(e)
    }
}

function generateContent({ titleHashtag, title, director, vote, release, resume, }, withHashtag = true) {
    const hashTagLines = `\n\n#Movie #MovieList${titleHashtag.length <= 10 ? ` #${titleHashtag}` : ""}`

    return `${title} 🍿\nDir: ${director} 🎬\n${vote}/10 ⭐️\nyear: ${release}\n${resume}${withHashtag ? hashTagLines : ""}`
}

const generateTweetContent = async (movie) => {
    if (movie) {
        const resume = movie?.overview?.length < 200 ? movie.overview : movie.tagline
        const release = movie.release?.split("-")[0]
        const vote = parseFloat(movie.vote_average).toFixed(1)
        const title = movie.original_title?.replace(/^[a-zA-Z0-9_.-]*$/, "") || movie.original_title

        console.log(title)

        const titleHashtag = title.split(" ").join("")
        let resumeAi = resume
        try {
            resumeAi = await resumeMovie(movie.original_title, movie.overview)
        } catch {
            resumeAi = resume
        }

        let content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: resumeAi })

        if (content.length > 280) {
            content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: resume })
        }

        if (content.length > 280) {
            content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: resume }, false)
        }

        if (content.length > 280) {
            content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: "" })
        }

        if (content) {
            const res = await getImageFromURL(movie.poster_path)
            const mediaId = await updloadImage(res)

            tweet(content, [mediaId])
        }
    }
}

const tweetCinematographByName = async (movieName, id = "", customPhotos = []) => {
    try {
        const cinematography = await getCinematography(movieName, id)
        if (customPhotos.length) {
            cinematography.topFourImages = customPhotos
        }
        if (!cinematography?.movie) {
            return {}
        }
        const topFourImageBlobPromises = cinematography?.topFourImages.map(c => getImageFromURL(c))
        const topFourImageBlob = await Promise.all(topFourImageBlobPromises)
        const uploadTwitterMediaIdsPromises = topFourImageBlob.map(img => updloadImage(img))
        const twitterMediaIds = await Promise.all(uploadTwitterMediaIdsPromises)
        return {
            twitterMediaIds,
            directorOfPhotography: cinematography.directorOfPhotography,
            movie: cinematography.movie
        }

    } catch (err) {
        console.error("There was an error", err)
    }
}

const tweetMovie = async (movieName) => {
    try {
        const movie = await getMovieByName(movieName)
        await generateTweetContent(movie)
    } catch (err) {
        console.error("There was an error", err)
    }
}

const tweetMovieById = async (movieName) => {
    try {
        const movie = await queryMovieById(movieName)
        await generateTweetContent(movie)
    } catch (err) {
        console.error("There was an error", err)
    }
}

app.get('/:movie', (req, res) => {
    if (req.headers.auth === process.env.PASS) {
        tweetMovie(req.params.movie)
        return res.send('ok');
    } else {
        return res.send("no auth")
    }
});

app.get('/movie/:id', (req, res) => {
    if (req.headers.auth === process.env.PASS) {
        tweetMovieById(req.params.id)
        return res.send('ok');
    } else {
        return res.send("no auth")
    }
});

app.post('/photography/:movie', jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { res.send("no auth") }
    const customImages = req.body?.images || []
    const id = req.body?.id || ""
    const value = await tweetCinematographByName(req.params.movie, id, customImages)

    if (value?.movie) {
        const movieName = value?.movie.original_title
        const directorOfPhotography = value?.directorOfPhotography
        const director = value?.movie.directorName
        const year = value?.movie?.release?.split("-")?.[0]

        const directedBy = `\nDirected by ${director}`
        const cinematographyBy = `\nCinematography by ${directorOfPhotography} 📷`
        const hashtags = `\n\n#Cinematography #Movie`

        const tweetContent = `${movieName} (${year})${director ? directedBy : ""}${directorOfPhotography ? cinematographyBy : ""}${hashtags}`

        tweet(tweetContent, value?.twitterMediaIds)
    }
    return res.send("ok")
})

function generateMusicTweetContent({ movie, composers }, soundtrackLink) {
    const year = movie.release?.split("-")?.[0]
    const originalSountrackBy = `\nOriginal soundtrack by ${composers} 🎹`
    const hashtags = `\n\n#OrignalMusic #MovieScore #OST`
    const tweetContent = `${movie.original_title} (${year})${originalSountrackBy}\n🔗${soundtrackLink}${hashtags}`
    return tweetContent
}

async function tweetOriginalSoundtrack(movie = "", soundtrack, { id = "" }) {
    const movieData = await getOriginalSoundtrackDb(movie, id)
    const content = generateMusicTweetContent(movieData, soundtrack)
    // const imageBlobPromises = await Promise.all(movieData?.images.map(getImageFromURL))
    // const uploadTwitterMediaIdsPromises = imageBlobPromises.map(updloadImage)
    // const imagesId = await Promise.all(uploadTwitterMediaIdsPromises)
    // console.log({ imagesId })
    const imageBlob = await getImageFromURL(movieData.poster_path)
    const image = await updloadImage(imageBlob)
    console.log(content)
    await tweet(content, [image])
}

app.post('/music/:movie', jsonParser, async (req, res) => {
    const movie = req.params.movie
    const spotifySoundtrack = req.body.spotify
    const id = req.body?.id || ""
    tweetOriginalSoundtrack(movie, spotifySoundtrack, { id })
    return res.send("ok")
})

app.get('/photography/:movie', async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { res.send("no auth") }

    const value = await tweetCinematographByName(req.params.movie)
    if (value?.movie) {

        const movieName = value?.movie.original_title
        const directorOfPhotography = value?.directorOfPhotography
        const year = value?.movie?.release?.split("-")?.[0]

        const tweetContent = `#Cinematography #movie #filmmakers #videography\n${movieName}, ${year}\nDir. of photography: ${directorOfPhotography}`

        console.log(tweetContent)
        if (value && value.directorOfPhotography && value.movie && value.twitterMediaIds) {
            tweet(tweetContent, value?.twitterMediaIds)
        }
    }
    return res.send("ok")
})


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
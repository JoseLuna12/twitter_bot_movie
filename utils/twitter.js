const e = require("express");
const { TwitterApi } = require("twitter-api-v2");
const { resumeMovie, getEmojisForMovie } = require("./openAi")

const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});

const MAX_CHARACTERS = 280

const bearer = new TwitterApi(process.env.BEARER_TOKEN);

const twitterClient = client.readWrite;
const twitterBearer = bearer.readOnly;

function uploadMultipleImages(images) {
    return Promise.all(images.map(updloadImage))
}
function updloadImage(image) {
    return twitterClient.v1.uploadMedia(image, { mimeType: "JPG", target: "tweet" })
}

const movieHashtags = {
    popular: ["#Movie", "#FilmTwitter"],
    listHashtags: `\n\n#MustWatch`,
    cinematographyHashtags: `\n\n#Cinematography #AppreciationPost`,
    soundtrackHashtags: `\n\n#OrignalMusic #MovieScore`,
    director: `\n\n#Director`,
    titleHashtag: (movie) => {
        if (movie) {
            const { original_title } = movie
            const title = original_title?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '') || original_title
            const titleHashtag = title.split(" ").join("")
            return ` #${titleHashtag}`
        }
    }
}

function generateMovieObject(content, movie, key) {
    return {
        content,
        hashtags: movieHashtags[key],
        titleHashtag: movieHashtags.titleHashtag(movie),
    }
}

function addHashtagOnCommand({ add = false, hashtag }) {
    if (add) {
        if (!movieHashtags.popular.includes(hashtag)) {
            movieHashtags.popular = [hashtag, ...movieHashtags.popular]
        }
    } else {
        movieHashtags.popular = movieHashtags.popular?.filter(um => um != hashtag)
    }
}

async function generateMovieListContent(movie, hashtagskey) {
    const { original_title, directorName, vote_average, release, overview } = movie

    const vote = parseFloat(vote_average) == 0.0 ? "" : `\n${vote_average}/10 ⭐️`

    const aiSummary = overview//await resumeMovie(overview)
    const content = `${original_title} (${release}) 🍿\nDir: ${directorName} 🎬${vote}\n${aiSummary}`

    addHashtagOnCommand({ add: !vote, hashtag: "#ComingSoon" })

    return generateMovieObject(content, movie, hashtagskey)
}

function generateCinematographyContent(movie, hashtagskey) {
    const { original_title, directorOfPhotography, release, directorName } = movie
    const content = `${original_title} (${release})\nDirected by ${directorName}\nCinematography by ${directorOfPhotography} 📷`

    return generateMovieObject(content, movie, hashtagskey)
}

function generateSoundtrackContent(movie, hashtagskey) {
    const { original_title, release, composers, spotify } = movie

    const content = `${original_title} (${release})\nOriginal soundtrack by ${composers} 🎹\n🔗 ${spotify}`
    return generateMovieObject(content, movie, hashtagskey)
}

async function generateDirectorContent(director, hashtagskey) {
    const { name, movies } = director
    const emojisPromise = movies.map(m => {
        return getEmojisForMovie(m.title)
    })
    const emojis = await Promise.all(emojisPromise)
    const moviesText = movies?.map((m, i) => {
        return `\n• ${m.title} (${m.release}) ${emojis[i]}`
    }).join("")
    const content = `Cinema by ${name} 🎞️\n${moviesText}`
    return generateMovieObject(content, director, hashtagskey)
}

function generateTweetContent(tweetContentObject, hashtags = []) {
    const popularHashtags = hashtags.join(" ")
    const titleHashtag = tweetContentObject.titleHashtag
    const postHashtags = tweetContentObject.hashtags

    const finalHashtags = `${postHashtags}${titleHashtag} ${popularHashtags}`

    const tweetContent = `${tweetContentObject.content}${finalHashtags}`

    if (tweetContent.length > MAX_CHARACTERS) {
        const tweetContentObjectCopy = { ...tweetContentObject }
        if (hashtags.length != 0) {
            hashtags.pop()
            return generateTweetContent(tweetContentObject, hashtags || [])
        } else if (tweetContentObject.titleHashtag?.length > 0) {
            tweetContentObjectCopy.titleHashtag = ""
            return generateTweetContent(tweetContentObjectCopy, [])
        } else if (tweetContentObject.hashtags?.length > 0) {
            tweetContentObjectCopy.hashtags = ""
            return generateTweetContent(tweetContentObjectCopy, [])
        }
        return tweetContentObject.content
    } else {
        return tweetContent
    }
}

async function testTweetValues(movie, getFunction, hashtagskey) {
    const value = await getFunction(movie, hashtagskey)
    const content = generateTweetContent(value, movieHashtags.popular)
    return content
}

async function getTweetValuesForList(movie) {
    const contentOBject = await generateMovieListContent(movie, "listHashtags")
    const content = generateTweetContent(contentOBject, movieHashtags.popular)
    const mediaIds = await uploadMultipleImages(movie?.images)
    return { content, mediaIds }
}

async function getTweetValuesForCinematography(movie) {
    const cinematography = generateCinematographyContent(movie, "cinematographyHashtags")
    const content = generateTweetContent(cinematography, movieHashtags.popular)
    const mediaIds = await uploadMultipleImages(movie?.images)
    return { content, mediaIds }
}

async function getTweetValuesForSoundtrack(movie) {
    const soundtrack = generateSoundtrackContent(movie, "soundtrackHashtags")
    const content = generateTweetContent(soundtrack, movieHashtags.popular)
    const mediaIds = [await updloadImage(movie.original_poster)]
    return { content, mediaIds }
}

async function getTweetValuesForDirector(director) {
    const directorData = await generateDirectorContent(director, "director")
    const content = generateTweetContent(directorData, movieHashtags.popular)
    const mediaIds = await uploadMultipleImages(director.movie_images)
    return { content, mediaIds }
}

async function tweetMovie(movie, type) {
    let content = ""
    let media_ids = []
    switch (type) {
        case "list":
            const { content: listContent, mediaIds: listMediaIds } = await getTweetValuesForList(movie)
            content = listContent
            media_ids = listMediaIds
            break;
        case "cinematography":
            const { content: cinematographyContent, mediaIds: cinematographyMediaIds } = await getTweetValuesForCinematography(movie)
            content = cinematographyContent
            media_ids = cinematographyMediaIds
            break;
        case "soundtrack":
            const { content: soundtrackContent, mediaIds: soundtrackMediaIds } = await getTweetValuesForSoundtrack(movie)
            content = soundtrackContent
            media_ids = soundtrackMediaIds
            break;
        case "director":
            const { content: directorContent, mediaIds: directorMediaIds } = await getTweetValuesForDirector(movie)
            content = directorContent
            media_ids = directorMediaIds
            break;
        case "test":
            const testValues = await testTweetValues(movie, generateMovieListContent, "listHashtags")
            console.log(testValues)
            console.log(testValues.length)
        default:
            break;
    }
    try {
        console.log(type)
        console.log(content)
        console.log(content.length)
        if (content) {
            await twitterClient.v2.tweet(content, { media: { media_ids } });
        }
    } catch (e) {
        console.log(e)
    }
}

module.exports = { tweetMovie };
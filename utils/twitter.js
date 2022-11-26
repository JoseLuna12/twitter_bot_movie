const { TwitterApi } = require("twitter-api-v2");
const { resumeMovie } = require("./openAi")

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
    listHashtags: `\n\n#Movie #MovieList`,
    cinematographyHashtags: `\n\n#Cinematography #Movie #AppreciationPost`,
    soundtrackHashtags: `\n\n#OrignalMusic #MovieScore #OST`,
    titleHashtag: ({ original_title }) => {
        const title = original_title?.replace(/[^a-z0-9]/gi, '') || original_title
        const titleHashtag = title.split(" ").join("")
        return ` #${titleHashtag}`
    }
}

function generateMovieObject(content, movie, key) {
    return {
        content,
        hashtags: movieHashtags[key],
        titleHashtag: movieHashtags.titleHashtag(movie),
    }
}

async function generateMovieListContent(movie, hashtagskey) {
    const { original_title, directorName, vote_average, release, overview } = movie

    const vote = parseFloat(vote_average) == 0.0 ? "" : `\n${vote_average}/10 ⭐️`

    const aiSummary = await resumeMovie(overview)
    const content = `${original_title} (${release}) 🍿\nDir: ${directorName} 🎬${vote}\n${aiSummary}`

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

function generateTweetContent(tweetContentObject, withHashtag = true, withTitleHashtag = true, times = 0) {
    const titleHashtag = withTitleHashtag ? `${tweetContentObject.titleHashtag}` : ""
    const hashtags = withHashtag ? `${tweetContentObject.hashtags}${titleHashtag}` : ""
    let tweetContent = `${tweetContentObject.content}${hashtags}`
    if (tweetContent.length > MAX_CHARACTERS && times == 0) {
        tweetContent = generateTweetContent(tweetContentObject, true, false, 1)
    } else if (tweetContent.length > MAX_CHARACTERS && times == 1) {
        tweetContent = generateTweetContent(tweetContentObject, false, false, 2)
    }
    return tweetContent
}

async function getTweetValuesForList(movie) {
    const contentOBject = await generateMovieListContent(movie, "listHashtags")
    const content = generateTweetContent(contentOBject)
    const mediaIds = await uploadMultipleImages(movie?.images)
    return { content, mediaIds }
}

async function getTweetValuesForCinematography(movie) {
    const cinematography = generateCinematographyContent(movie, "cinematographyHashtags")
    const content = generateTweetContent(cinematography)
    const mediaIds = await uploadMultipleImages(movie?.images)
    return { content, mediaIds }
}

async function getTweetValuesForSoundtrack(movie) {
    const soundtrack = generateSoundtrackContent(movie, "soundtrackHashtags")
    const content = generateTweetContent(soundtrack)
    const mediaIds = [await updloadImage(movie.original_poster)]
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
        default:
            break;
    }
    try {
        console.log(type)
        console.log(content)
        if (content) {
            await twitterClient.v2.tweet(content, { media: { media_ids } });
        }
    } catch (e) {
        console.log(e)
    }
}

module.exports = { tweetMovie };
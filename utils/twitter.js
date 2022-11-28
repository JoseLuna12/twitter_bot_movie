const { TwitterApi } = require("twitter-api-v2");
const { resumeMovie, getEmojisForMovie } = require("./openAi")
const { add, addTweetId, addThreadById } = require("../database/index");
const e = require("express");

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

let tweetType = "list"
let lastDbTweet = 0

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
    soundtrackHashtags: `\n\n#MovieScore #Spotify`,
    director: `\n\n#Director`,
    featuredHashtags: `\n\n#Featuring`,
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
        hashtags: key ? movieHashtags[key] : "",
        titleHashtag: movie ? movieHashtags.titleHashtag(movie) : "",
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

    const aiSummary = await resumeMovie(overview)
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

async function getBulkAiMovieSummary(movies) {
    const newSummary = await Promise.all(movies.map(m => resumeMovie(m.overview)))
    return movies.map((m, index) => ({ ...m, aiSummary: newSummary[index] }))
}

async function getThreadFromFeaturedPerson(person) {

    return person?.movies?.map((p, index) => {
        const aiSummary = p.aiSummary || p.overview

        if (index == 0) {
            const movieObj = generateMovieObject(`Featuring ${person.name} 🍿\n${index + 1}) ${p.name}\n${aiSummary}`, { original_title: person.name }, "featuredHashtags")
            return generateTweetContent(movieObj, movieHashtags.popular)
        } else {
            const movieObj = generateMovieObject(`${index + 1}) ${p.name}\n${aiSummary}`)
            return generateTweetContent(movieObj, [])
        }
    })
}

function getSingleFeaturedPerson(person) {
    const movies = person?.movies?.map((p) => {
        return `\n• ${p.name}`
    })?.join("")
    return `Featuring ${person.name}${movies}`
}

async function generateFeaturedByContent({ person, thread }, hashtagskey) {
    let content = ""
    if (thread) {
        person.movies = await getBulkAiMovieSummary(person?.movies)
        content = await getThreadFromFeaturedPerson(person)
        return content
    } else {
        content = getSingleFeaturedPerson(person)
        const movieObject = generateMovieObject(content, { ...person, original_title: person.name }, hashtagskey)
        return generateTweetContent(movieObject, movieHashtags.popular)
    }
}

async function saveTweet(tweet) {
    const { error, data } = await add({ ...tweet, type: tweetType })
    if (!error) {
        lastDbTweet = data?.[0].id
        console.log("Saving to db Success!", data?.[0].id)
    }
}

function generateTweetContent(tweetContentObject, hashtags = []) {
    console.log({ tweetContentObject })
    const popularHashtags = hashtags.join(" ")
    const titleHashtag = tweetContentObject.titleHashtag || ""
    const postHashtags = tweetContentObject.hashtags || ""

    const finalHashtags = `${postHashtags}${titleHashtag} ${popularHashtags}`

    const tweetContent = `${tweetContentObject.content}${finalHashtags}`

    const finalTweet = {
        content: tweetContentObject.content,
        hashtags: finalHashtags
    }

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
        return tweetContent
    } else {
        saveTweet(finalTweet)
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

async function getTweetValuesForFeaturedPerson({ person, thread }) {
    const featuredData = await generateFeaturedByContent({ person, thread }, "featuredHashtags")
    const images = await uploadMultipleImages(person.movies.map(m => m.bufferImage))
    return { content: featuredData, mediaIds: images }
}

async function tweetMovie(movie, type) {
    let content = ""
    let media_ids = []
    tweetType = type
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
        case "featuredby":
            const { content: featuredContent, mediaIds: featuredMediaIds } = await getTweetValuesForFeaturedPerson(movie)
            content = featuredContent
            media_ids = featuredMediaIds
            break;
        case "test":
            const testValues = await testTweetValues(movie, generateMovieListContent, "listHashtags")
            console.log(testValues)
        default:
            break;
    }
    try {
        console.log(type)
        console.log(content)
        console.log(content.length)
        if (content && !movie.thread) {
            const { data: { id } } = await twitterClient.v2.tweet(content, { media: { media_ids } });
            await addTweetId({ tweet_id: id, id: lastDbTweet })
        }
        if (content?.length && movie.thread) {
            const threadTweets = content.map((cont, index) => {
                return {
                    text: cont,
                    media: { media_ids: [media_ids[index]] }
                }
            })
            const newTweets = await twitterClient.v2.tweetThread(threadTweets)
            const tweetsIds = newTweets.map(nt => nt.data.id)
            await addThreadById({ id: lastDbTweet, thread: tweetsIds, tweet_id: tweetsIds[0] })
        }
    } catch (e) {
        console.log(e)
    }
}

module.exports = { tweetMovie };
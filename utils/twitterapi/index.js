const { addv2, getSupabaseID, getTweetById, getSupabaseData, updateTweetById } = require("../../database")
const twitterClient = require("./client")
const { getBufferFromImage } = require("./utl")

function uploadMedia(image) {
    return twitterClient.v1.uploadMedia(image, { mimeType: "JPG", target: "tweet" })
}

async function uploadMediaTweet(images = []){
    const bufferImages = await Promise.all(images.map(getBufferFromImage))
    return Promise.all(bufferImages.map(uploadMedia))
}

const movieHashtags = {
    popular: ["#Movie", "#FilmTwitter"],
    list: `#MustWatch`,
    cinematography: `#Cinematography #AppreciationPost`,
    soundtrack: `#MovieScore #Spotify`,
    director: `#Director`,
    featuredHashtags: `#Featuring`,
    transformToHashtag: (text) => {
        if (text) {            
            const title = text?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '') || text
            const titleHashtag = title.split(" ").join("")
            return `#${titleHashtag}`
        }else {
            return ""
        }
    }
}

async function listTweetFormat(movie, options){
    const year = movie.release_date ? `(${movie.release_date})` : ""
    const rating = movie.vote_average ? `${movie.vote_average}/10` : ""

    const emojis = options.Emoji ? "" : ""

    const imageToUse = options.Poster ? movie.bestPoster : movie.bestBackdrop

    const head = `${movie.title}${emojis} ${year} 🍿\nDir: ${movie.director} 🎬\n${rating}⭐️`
    const body = options.Ai ? movie.overview : movie.overview
    const hashtag = `${movieHashtags.list} ${movieHashtags.popular.join(" ")} ${movieHashtags.transformToHashtag(movie.title)}`
    const images = [imageToUse]

    const tweet = {
        head,
        body,
        hashtag,
        images
    }
    const url = options.Url ? `${options.Url}` : ""
    const supabase = await addv2({...tweet, tweet_type:"list", url})
    const dbId = getSupabaseID(supabase)

    return {...tweet, dbId}
}

async function cinematographyTweetFormat(movie, options){
    const year = movie.release_date ? `(${movie.release_date})` : ""

    const emojis = options.Emoji ? "" : ""

    const head = `${movie.title}${emojis} ${year}`
    const body = `Directed by ${movie.director}\nCinematography by ${movie.musicComposer} 📷` //options.Ai ? movie.overview : movie.overview
    const hashtag = `${movieHashtags.cinematography} ${movieHashtags.popular.join(" ")} ${movieHashtags.transformToHashtag(movie.title)}`
    const images = movie.topImages

    const tweet = {
        head, 
        body,
        hashtag,
        images
    }
    const supabase = await addv2({...tweet, tweet_type: "cinematography"})
    const dbId = getSupabaseID(supabase)

    return {...tweet, dbId}
}

async function soundtrackTweetFormat(movie, options){
    const year = movie.release_date ? `(${movie.release_date})` : ""

    const emojis = options.Emoji ? "" : ""

    const head = `${movie.title}${emojis} ${year}`
    const body = `Original soundtrack by ${movie.musicComposer} 🎹` //options.Ai ? movie.overview : movie.overview
    const hashtag = `${movieHashtags.soundtrack} ${movieHashtags.popular.join(" ")} ${movieHashtags.transformToHashtag(movie.title)}`
    const imageToUse = options.Poster ? [movie.bestPoster] : [movie.bestBackdrop]

    const tweet = {
        head, 
        body,
        hashtag,
        images: imageToUse
    }

    const url = options.Url ? `${options.Url}` : ""

    const supabase = await addv2({...tweet, tweet_type: "cinematography", url})
    const dbId = getSupabaseID(supabase)

    return {...tweet, dbId}
}

async function directorTweetFormat(director, options){

    const contentObject = director?.knownFor?.map((mv) => {
        const year = mv.release_date ? ` (${mv.release_date}) ` : ""
        return {
            title: `${mv.title}${year}`,
            image: mv.image
        }
    })

    const emojis = ""

    const simpleBody = contentObject.map((content) => `• ${content.title}${emojis}`)
    const images = contentObject.map((content) => content.image)

    const head = `Cinema by ${director.name} 🎞️`
    const body = simpleBody.join(`\n`)
    const hashtag = `${movieHashtags.director} ${movieHashtags.popular.join(" ")} ${movieHashtags.transformToHashtag(director.name)}`

    const tweet = {
        head,
        body,
        hashtag,
        images
    }
    const supabase = await addv2({...tweet, tweet_type: "director"})
    const dbId = getSupabaseID(supabase)

    return {...tweet, dbId}
}

async function movieToTweet(movie , options = {}, type = ""){
    console.log(options)
    if (type == "list"){
        return await listTweetFormat(movie, options)
         
    }
    if (type == "cinematography"){
        return await cinematographyTweetFormat(movie, options)
    }
    if(type == "soundtrack"){
        return await soundtrackTweetFormat(movie, options)
    }

    if(type == "director"){
        return await directorTweetFormat(movie, options)
    }
}

async function postTweetById(id){
    const tweetDB = await getTweetById(id)
    const tweetData = getSupabaseData(tweetDB)
    const {images, head, body, hashtag, url} = tweetData

    const txtUrl = url ? `\n🔗 ${url}` : ""

    const content = `${head}\n${body}${txtUrl}\n\n${hashtag}`
    const mediaIds = await uploadMediaTweet(images)

    console.log(content)
    const { data: { id: tweet_id } }  = await twitterClient.v2.tweet(content,{ media: { media_ids: mediaIds } })
    await updateTweetById(id, {tweet_id, posted: true})

}

module.exports = {movieToTweet, postTweetById}
const { addv2, getSupabaseID, getTweetById, getSupabaseData, updateTweetById, addIdsToThread } = require("../../database")
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
    person: ``,
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

    const head = `${movie.title}${emojis} ${year} 🍿\nDir: ${movie.director} 🎬`
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

async function handleThread(tweetData, knownFor, options) {
    // console.log({tweetData, knownFor, options})

    const isSameMovie = knownFor.every(mov => knownFor[0].id == mov.id)

    const headerEmoji = options.Emoji ? "🍿" : ""
    const firstHeader = `Featuring ${tweetData.name}`
    const headerPrefix =  isSameMovie ? `in ${knownFor[0].title}${headerEmoji}` : ''

    const threadTweet = knownFor.map((movie, index) => {
        const roleName = movie?.role && movie?.role != "" ? `as ${movie.role}` : ""
        const movieTitle = !isSameMovie ? `${index+1}) ${movie.name} ${roleName ? `${roleName}` : ""}` : ""
        const review = isSameMovie ? `${movie.overview || ""}` : ""
        if(index == 0){
            return {
                head: `${firstHeader} ${headerPrefix}`,
                body: `${movieTitle}${review}`,
                hashtag: "",
                images: [movie.image]
            }
        }
        const secondaryHeader = isSameMovie? "" : movieTitle
        return {
            head: `${secondaryHeader}`,
            body: "",
            hashtag: "",
            images: [movie.image]
        }
    })

    const dbPromises = threadTweet.map((tw,index) => {
        const postType = index == 0 ? tweetData.known_for_department : "thread"
        return addv2({...tw, tweet_type: postType})
    })

    const saveToSupabase = await Promise.all(dbPromises)
    const supabaseIds = saveToSupabase.map(getSupabaseID)

    await addIdsToThread(supabaseIds)
    
    return threadTweet.map((tw, index) => ({...tw, dbId: supabaseIds[index]}))

}

async function personTweetFormat(person, options){
  
    const contentObject = person?.knownFor?.map((mv) => {
        const year = mv.release_date ? ` (${mv.release_date}) ` : ""
        return {
            id: mv.id,
            title: `${mv.title}${year}`,
            name: mv.title,
            role: mv.role,
            image: options.Poster ? mv.bestPoster : mv.image,
            overview: mv.overview
        }
    })

    if(options.Thread){
        return await handleThread(person, contentObject, options)
    }

    const isSameMovie = contentObject.every(mov => contentObject[0].id == mov.id)
    const headerPrefix =  isSameMovie ? ` in ${contentObject[0].title}$` : ''

    const emojis = options.Emoji ? "🎭" : ""

    const simpleBody = contentObject.map((content) => `• ${content.title}${emojis}`)
    const images = contentObject.map((content) => content.image)

    const head = person.known_for_department == "Directing" ? `Cinema by ${person.name} 🎞️` : `Featuring ${person.name}${headerPrefix} ${emojis}`
    const body = simpleBody.join(`\n`)
    const hashtag = `${movieHashtags.person} ${movieHashtags.popular.join(" ")} ${movieHashtags.transformToHashtag(person.name)}`

    const tweet = {
        head,
        body,
        hashtag,
        images
    }
    const supabase = await addv2({...tweet, tweet_type: "person"})
    const dbId = getSupabaseID(supabase)
    console.log({dbId})
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
        return await personTweetFormat(movie, options)
    }

    if(type == "person"){
        return await personTweetFormat(movie, options)
    }
}

async function getTweetContent(tweetData){
    const {images, head, body, hashtag, url} = tweetData

    const txtUrl = url ? `\n🔗 ${url}` : ""

    const text = `${head}\n${body}${txtUrl}\n\n${hashtag}`
    const mediaIds = await uploadMediaTweet(images)
    const media = { media_ids: mediaIds }

    return {text, media}
}

async function postSingleTweet(id, {text, media}){
    const { data: { id: tweet_id } }  = await twitterClient.v2.tweet(text,{media})
    await updateTweetById(id, {tweet_id, posted: true})
}

async function postThread(ids,tweet = []){
    const newTweets = await twitterClient.v2.tweetThread(tweet)
    const tweetsIds = newTweets.map(nt => nt.data.id)
    const promises = tweetsIds.map((id, index) => updateTweetById(ids[index], {tweet_id: id, posted: true}))
    await Promise.all(promises)

    // const dbPromises = ids.map(id => updateTweetById(id, {tweet_id: "", posted: true}))
}

async function getTreadFromTweet(thread_ids = []) {
    const threadPromises = thread_ids.map(id => getTweetById(id))
    const dbThreads = await Promise.all(threadPromises)
    const threads = dbThreads.map(getSupabaseData)
    const tweetValues = []
    for await (const thread of threads){
        const tweetContent = await getTweetContent(thread)
        tweetValues.push(tweetContent)
    }
    return tweetValues
}

async function postTweetById(id){
    const tweetDB = await getTweetById(id)
    const tweetData = getSupabaseData(tweetDB)
    const tweetContent = await getTweetContent(tweetData)
    if(tweetData.thread_ids?.length){
        const tweetThreads = await getTreadFromTweet(tweetData.thread_ids)
            await postThread(tweetData.thread_ids, [tweetContent,...tweetThreads])
        return 
    }
    await postSingleTweet(id, tweetContent)
    return
}

module.exports = {movieToTweet, postTweetById}
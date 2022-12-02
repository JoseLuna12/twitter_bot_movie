const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)


function addv2(values){
    return supabase.from("movies_tweet").insert(values).select("id")
}

function getTweetById(id){
    return supabase.from("movies_tweet").select().eq('id', id)
}

function getAllTweets(){
    return supabase.from("movies_tweet").select()
}

function updateTweetById(id, data){
    return supabase.from("movies_tweet").update(data).eq('id', id).select("id")
}

function deleteTweetById(id){
    return supabase.from("movies_tweet").delete().eq('id', id)
}

function addIdsToThread(ids = []){
    const [parentId, ...childIds] = ids
    return supabase.from("movies_tweet").update({thread_ids: childIds}).eq('id', parentId).select("id")
}

async function removeIdToThread(parentId, childId){
    const parentTweet = getSupabaseData(await getTweetById(parentId))
    const newThreadIds = parentTweet?.thread_ids.filter(thrId => thrId != childId)
    return supabase.from("movies_tweet").update({thread_ids: newThreadIds}).eq('id', parentId).select("id")
}

function saveImagePalette(image){
    return supabase.from("images_palette").insert(image).select("id")
}

function getimagePaletteById(id){
    return supabase.from("images_palette").select().eq('id', id)
}






async function add(values) {
    console.log("saving to database")
    return supabase.from("movies_tweeted").insert(values).select("id")
}

async function addTweetId({ tweet_id, id }) {
    return supabase.from("movies_tweeted").update({ tweet_id }).eq('id', id).select("id")
}

async function addThreadById({ id, thread, tweet_id }) {
    return supabase.from("movies_tweeted").update({ thread, tweet_id }).eq('id', id).select("id")
}

function getSupabaseData(obj){
    const {error, data} = obj
    if(error){
        throw new Error("error creating tweet into db")
    }
    else{
        return data[0]
    }
}

function getSupabaseID(obj){
    if(obj.error){
        console.log(obj.error)
        throw new Error("error creating tweet into db")
    }
    else{
        return obj.data[0].id
    }

}

module.exports = { add, addv2, addTweetId, addThreadById, db: supabase, getSupabaseID, getTweetById, getSupabaseData, updateTweetById, deleteTweetById, addIdsToThread,removeIdToThread, getAllTweets, saveImagePalette, getimagePaletteById }

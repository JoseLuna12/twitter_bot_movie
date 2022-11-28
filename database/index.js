const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

module.exports = { add, addTweetId, addThreadById, db: supabase }

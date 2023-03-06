require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const { createClient } = require('@supabase/supabase-js')

const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});

const bearer = new TwitterApi(process.env.BEARER_TOKEN);
const twitterClient = client.readWrite;

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)



async function testFunction() {
    const { data: test } = await supabaseClient.from("tweet_later").select('movie_tweetid, movie_tweetid(*)')
    console.log(test)
}


testFunction()

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
    // const { data: { id } } = await twitterClient.v2.me()
    // // const test = await twitterClient.v2.retweet(id, "1598811395466100736")
    // const test = await twitterClient.v2.unretweet(id, "1598811395466100736")
    // console.log(test)

    const { data, error } = await supabaseClient.from("movies_tweet").select().is("thread_ids", null).is("posted", true).order('last_retweeted_date', { ascending: true });
    let retweetCandidate = await getRetweetCandidate(null, data, supabaseClient)
    // await retweetById(req.params.id)

    console.log(retweetCandidate)
}


async function getRetweetCandidate(currentCandidate, list, client) {
    if (currentCandidate == null) {
        currentCandidate = list.pop()
        if (currentCandidate.tweet_id && currentCandidate.tweet_type != "thread") {
            const { data, error } = await client.from("movies_retweeted").select().eq('tweet_id', currentCandidate.tweet_id)
            data.forEach(d => {
                if (d.status == "RETWEETED") {
                    currentCandidate = null
                }
            })
        } else {
            currentCandidate = null
        }
        return getRetweetCandidate(currentCandidate, list, supabaseClient)
    }
    else {
        return currentCandidate
    }
}

testFunction()

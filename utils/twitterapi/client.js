const { TwitterApi } = require("twitter-api-v2");
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});

const MAX_CHARACTERS = 280
const CHARS_THRESHOLD = 270

const bearer = new TwitterApi(process.env.BEARER_TOKEN);

const twitterClient = client.readWrite;

module.exports = twitterClient
require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});

const bearer = new TwitterApi(process.env.BEARER_TOKEN);
const twitterClient = client.readWrite;



async function testFunction() {
    const test = await twitterClient.v2("1596910444463247364")
    console.log(test)
}

// testFunction()

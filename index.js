require("dotenv").config({ path: __dirname + "/.env" });
const express = require('express')
const app = express()
const port = process.env.PORT || 4000;
const { twitterClient } = require("./twitter")

const tweet = async (content) => {
    try {
        await twitterClient.v2.tweet(content);
    } catch (e) {
        console.log(e)
    }
}

app.get('/:movie', (req, res) => {
    if (req.headers.auth === process.env.PASS) {
        tweet(req.params.movie);
        return res.send('ok');
    } else {
        return res.send("no auth")
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
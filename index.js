if (!process.env.PORT) {
    require("dotenv").config();
}
const express = require('express')
const app = express()
const port = process.env.PORT || 4000;
const { twitterClient } = require("./twitter")
const { getMovieByName } = require("./imdb")

const tweet = async (content) => {
    try {
        await twitterClient.v2.tweet(content);
    } catch (e) {
        console.log(e)
    }
}

const generateTweetContent = (movie) => {
    if (movie) {
        const vote = parseFloat(movie.vote_average).toFixed(1)
        return `${movie.original_title} ${vote}/10`
    }
    return ""
}

app.get('/:movie', (req, res) => {
    if (req.headers.auth === process.env.PASS) {
        // tweet(req.params.movie);
        const movie = getMovieByName(req.params.movie)
        const content = generateTweetContent(movie)
        if (content) {
            tweet(content)
        }
        return res.send('ok');
    } else {
        return res.send("no auth")
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
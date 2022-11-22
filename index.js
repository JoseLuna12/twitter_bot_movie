if (!process.env.PORT) {
    require("dotenv").config();
}
const express = require('express')
const app = express()
const port = process.env.PORT || 4000;
const { twitterClient } = require("./twitter")
const { getMovieByName } = require("./imdb")
// const { resumeMovie } = require("./openai")

const tweet = async (content) => {
    try {
        await twitterClient.v2.tweet(content);
    } catch (e) {
        console.log(e)
    }
}

const generateTweetContent = async (movie) => {
    if (movie) {
        const resume = movie?.overview?.length < 200 ? movie.overview : movie.tagline
        const release = movie.release?.split("-")[0]
        const vote = parseFloat(movie.vote_average).toFixed(1)

        const title = movie.original_title.replace(/^[a-zA-Z0-9_.-]*$/, "") || movie.original_title
        console.log(title)
        const titleHashtag = title.split(" ").join("")

        const content = `#Movie #MovieList #${titleHashtag}\n${movie.original_title} 🍿\nDir: ${movie.directorName} 🎬\n${vote}/10 ⭐️\nyear: ${release}\n${resume}`
        if (content) {
            // console.log(content)
            tweet(content)
        }
    }
}

const tweetMovie = async (movieName) => {
    try {
        const movie = await getMovieByName(movieName)
        await generateTweetContent(movie)
    } catch (err) {
        console.error("There was an error", err)
    }

}

app.get('/:movie', (req, res) => {
    if (req.headers.auth === process.env.PASS) {
        tweetMovie(req.params.movie)
        return res.send('ok');
    } else {
        return res.send("no auth")
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
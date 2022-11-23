if (!process.env.PORT) {
    require("dotenv").config();
}
const express = require('express')
const app = express()
const port = process.env.PORT || 4000;
const { twitterClient, updloadImage } = require("./twitter")
const { getMovieByName, getImageFromURL } = require("./imdb")
const { resumeMovie } = require("./openai")

const tweet = async (content, mediaId) => {
    try {
        await twitterClient.v2.tweet(content, { media: { media_ids: [mediaId] } });
    } catch (e) {
        console.log(e)
    }
}

function generateContent({ titleHashtag, title, director, vote, release, resume }) {
    return `#Movie #MovieList${titleHashtag.length <= 10 ? ` #${titleHashtag}` : ""}\n${title} 🍿\nDir: ${director} 🎬\n${vote}/10 ⭐️\nyear: ${release}\n${resume}`
}

const generateTweetContent = async (movie) => {
    if (movie) {
        const resume = movie?.overview?.length < 200 ? movie.overview : movie.tagline
        const release = movie.release?.split("-")[0]
        const vote = parseFloat(movie.vote_average).toFixed(1)


        const title = movie.original_title.replace(/^[a-zA-Z0-9_.-]*$/, "") || movie.original_title
        console.log(title)
        const titleHashtag = title.split(" ").join("")
        let resumeAi = resume
        try {
            resumeAi = await resumeMovie(movie.original_title, movie.overview)
        } catch {
            resumeAi = resume
        }

        let content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: resumeAi })

        if (content.length > 280) {
            content = generateContent({ titleHashtag, director: movie.directorName, release, vote, title: movie.original_title, resume: resume })
        }
        if (content) {
            console.log(movie.poster_path)
            const res = await getImageFromURL(movie.poster_path)
            const mediaId = await updloadImage(res)

            try {
                tweet(content, mediaId)
            } catch {

            }

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
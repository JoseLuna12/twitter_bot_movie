if (!process.env.PORT) {
    require("dotenv").config();
}

const { tweetMovie } = require("./utils/twitter")
const { makeMovieRequest, makeCinematographyRequest, makeOriginalSoundtrackRequest, makeDirectorRequest } = require("./utils/movieDatabase")

const express = require('express')
var bodyParser = require('body-parser')

const app = express()
var jsonParser = bodyParser.json()

const port = process.env.PORT || 4000;


app.get('/:movie', async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const movie = await makeMovieRequest({ name: req.params.movie })
    tweetMovie(movie, "list")
    return res.send("ok")
});

app.get('/movie/:id', async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const movie = await makeMovieRequest({ id: req.params.id })
    tweetMovie(movie, "list")
    return res.send("ok")
});

app.get('/director/:name', async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const name = req.params.name
    const directorData = await makeDirectorRequest({ name })
    tweetMovie(directorData, "director")
    return res.send("ok")
})

app.post('/photography/:movie', jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const customImages = req.body?.images || []
    const id = req.body?.id || ""

    const movie = await makeCinematographyRequest({ name: req.params.movie, id, images: customImages })
    tweetMovie(movie, "cinematography")

    return res.send("ok")
})


app.post('/music/:movie', jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const id = req.body?.id || ""

    const movie = await makeOriginalSoundtrackRequest({ name: req.params.movie, id, spotify: req.body.spotify })
    tweetMovie(movie, "soundtrack")

    return res.send("ok")
})


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
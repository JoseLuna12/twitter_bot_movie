if (!process.env.PORT) {
    require("dotenv").config();
}

/* 
TODO refactor movie api to only return data
TODO refactor movie api to return the same object
TODO refactor tweet to return a tweet object 
    {
        head: string
        body: string
        hashtag: string
        images: string[]
    }
TODO store this object in db
TODO create function that recieves tweet object and tweet it
*/
const {movie: movieQuery, director} = require("./utils/movie")
const {movieToTweet, postTweetById} = require("./utils/twitterapi")

const { tweetMovie } = require("./utils/twitter")
const { makeMovieRequest, makeCinematographyRequest, makeOriginalSoundtrackRequest, makeDirectorRequest, makeFeaturedPersonRequest } = require("./utils/movieDatabase")

const express = require('express')
const cors = require('cors')

var bodyParser = require('body-parser');
const { getTweetById, getSupabaseData, updateTweetById, getSupabaseID, deleteTweetById } = require("./database");

const app = express()
var jsonParser = bodyParser.json()
app.use(cors())

const port = process.env.PORT || 4000;

app.get('/test/:movie', async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const movie = await makeMovieRequest({ name: req.params.movie })
    // movie.overview = "The paragraph is about how Hollywood was full of ambition and excess and how it all eventually led to a fall."
    // tweetMovie(movie, "test")
    // return res.send("ok")
    res.json(movie)
});


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

app.post('/featuring/:person', jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const person = req.params.person
    const id = req.body.id || ""
    const movieFeatures = req.body.features || []
    const inThread = req.body.thread || true
    const queriedPerson = await makeFeaturedPersonRequest({ name: person, id, featured: movieFeatures })
    tweetMovie({ person: queriedPerson, thread: inThread }, "featuredby")
    return res.send("ok")
})










//create movie tweet
app.post('/api/movie/', jsonParser, async(req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const name = req.body.name
    const id = req.body.id
    const options = req.body.options
    const type = req.body.type || 'list'
    const images = req.body.images || []
    try{
        const movie = await movieQuery({name, id}, images)
        const movieTweetObject = await movieToTweet(movie, options, type)
        res.json({movieTweet: movieTweetObject})
    }catch(err){
        console.log(err)
        res.json({error: "there was a problem: " + `${err}`})
    }
})

//create Director tweet
app.post("/api/director/", jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const name = req.body.name
    const id = req.body.id
    const options = req.body.options
    const type = req.body.type || 'list'
    const images = options?.Images ? req.body.images || [] : []
    try{
        const directorData = await director({name, id, images})
        const movieTweetObject = await movieToTweet(directorData, options, type)
        res.json({movieTweet: movieTweetObject})
    }catch(err){
        console.log(err)
        res.json({error: "there was a problem: " + `${err}`})
    }
})

//get tweet from db
app.get('/api/supabase/tweet/:id', async(req,res)=> {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const id = req.params.id
    const value = await getTweetById(id)
    const tweet = getSupabaseData(value)
    return res.json(tweet)
})

//post a tweet to twitter
app.post('/api/tweet/',jsonParser, async(req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const id = req.body?.id
    console.log(id)
    const test = await postTweetById(id)
    console.log(test)
    res.json({ok: "ok"})
})

//update a tweet in the db
app.put('/api/supabase/tweet/:id', jsonParser, async (req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const tweet = req.body.tweet
    const id = req.params.id
    const supabaseTweet = await updateTweetById(id, tweet)
    const response = getSupabaseID(supabaseTweet)
    res.json({response})
})

//delete a tweet from the db
app.delete('/api/supabase/tweet/:id', async(req, res) => {
    if (!(req.headers.auth === process.env.PASS)) { return res.send("no auth") }
    const id = req.params.id
    await deleteTweetById(id)
    res.json("deleted")
})



app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
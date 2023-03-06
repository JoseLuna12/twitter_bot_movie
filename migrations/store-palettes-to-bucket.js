require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const { createClient } = require('@supabase/supabase-js');
const { getBufferFromImage, getMimeTypeFromArrayBuffer } = require("../utils/twitterapi/utl");
const { get_image_color_palette } = require("../utils/palette/color_palette_gen");

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


async function transformImage(image) {
    const image_buffer = await getBufferFromImage(image)

    let mime = getMimeTypeFromArrayBuffer(image_buffer)

    const unit8arr = new Uint8Array(image_buffer);
    // const result = new Uint8Array(get_image_color_palette(unit8arr, mime?.ext ?? 'jpg', 21))
    const buff = Buffer.from(unit8arr);
    return { buffer: buff, mime }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // const whiteList = ['b25704cf-62e7-45b5-9b3c-f55f07ac668a', '70e182f0-5bc4-4c38-a5b2-0724c0dba25c', '9b36012b-0911-463b-9bde-9766c1132043', '8a3c76a2-b34c-4b77-8357-012015e238db', '5e9a5cf5-21cb-4b8d-96f0-855e33dfd46a', '275e659a-d32a-406c-bed3-5c10292f1864', '0abf59e3-02e0-4141-be29-800708d03e7e', 'a7a72605-2567-412b-9f86-894f47a23a55', '02d3233a-5c2e-41a8-9af8-1229a2c020fb', '2944af53-bbc3-4f77-ab52-345ca66ce476'];
    const { data: list } = await supabaseClient.from("movies_tweet").select().eq("tweet_type", "Palette")
    const idImages = list.map(twt => {
        return {
            id: twt.id,
            image: twt.images[0][0]
        }
    })
    console.log(idImages)

    // for (const im of idImages) {
    //     if (im.image.includes("http://localhost:4000/")) {
    //         const { buffer, mime } = await transformImage(im.image)
    //         const date = new Date()
    //         const { data: imgData } = await supabaseClient.storage.from("palette-images").upload(`${date.getTime()}.${mime?.ext ?? 'jpg'}`, buffer)
    //         const { data: publicData } = await supabaseClient.storage.from("palette-images").getPublicUrl(imgData.path)

    //         await supabaseClient.from("movies_tweet").update({ images: [publicData.publicUrl] }).eq("id", im.id)
    //         await sleep(1000)
    //     }

    // }

}

main()
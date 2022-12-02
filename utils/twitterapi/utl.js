const axios = require('axios');

async function getBufferFromImage(url){
    let image = await axios.get(url, { responseType: 'arraybuffer' });
    let returnedB64 = Buffer.from(image.data);

    return returnedB64
}

async function getBolbFromImage(url){
    const buffer = await getBufferFromImage()
    // const blob = Blob.
}

module.exports = {getBufferFromImage, getBolbFromImage}
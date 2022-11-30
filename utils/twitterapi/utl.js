const axios = require('axios');

async function getBufferFromImage(url){
    let image = await axios.get(url, { responseType: 'arraybuffer' });
    let returnedB64 = Buffer.from(image.data);

    return returnedB64
}

module.exports = {getBufferFromImage}
const axios = require('axios');
const { get_image_color_palette } = require("../palette/color_palette_gen")

async function transformImageWithPalette(image) {
    const image_buffer = await getBufferFromImage(image)

    let mime = getMimeTypeFromArrayBuffer(image_buffer)

    const unit8arr = new Uint8Array(image_buffer);
    const result = new Uint8Array(get_image_color_palette(unit8arr, mime?.ext ?? 'jpg', 21))
    const buff = Buffer.from(result);
    return { buffer: buff, mime }
}

function getMimeTypeFromArrayBuffer(arrayBuffer) {
    const uint8arr = new Uint8Array(arrayBuffer)

    const len = 4
    if (uint8arr.length >= len) {
        let signatureArr = new Array(len)
        for (let i = 0; i < len; i++)
            signatureArr[i] = (new Uint8Array(arrayBuffer))[i].toString(16)
        const signature = signatureArr.join('').toUpperCase()

        switch (signature) {
            case '89504E47':
                return { ext: "png", mime: 'image/png' }
            case 'FFD8FFDB':
            case 'FFD8FFE0':
                return { ext: "jpg", mime: 'image/jpeg' }
            default:
                return null
        }
    }
    return null
}


async function getBufferFromImage(url, getMime = false) {
    let image = await axios.get(url, { responseType: 'arraybuffer' });
    let returnedB64 = Buffer.from(image.data);
    if (getMime) {
        return { base64: returnedB64, mime: getMimeTypeFromArrayBuffer(returnedB64) }
    }
    return returnedB64
}

async function getBolbFromImage(url) {
    const buffer = await getBufferFromImage()
    // const blob = Blob.
}

module.exports = { getBufferFromImage, getBolbFromImage, transformImageWithPalette, getMimeTypeFromArrayBuffer }
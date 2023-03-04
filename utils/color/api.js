const { generateImagePalette } = require(".");
const { getimagePaletteById } = require("../../database");



async function generateImage(id) {
    const { error, data } = await getimagePaletteById(id)
    const img = data[0]
    const imageToSend = await generateImagePalette(img)
    return imageToSend
}

module.exports = { generateImage }
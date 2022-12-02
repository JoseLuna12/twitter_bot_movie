
var colorSort = require('color-sorter')
const nodeHtmlToImage = require('node-html-to-image')
const ColorThief = require('colorthief');
const axios = require('axios');


async function getColorPalleteByUrl(img, quantity = 10){
    return new Promise((resolve) => {
        ColorThief.getPalette(img, quantity).then(pallete => resolve(pallete))
    })
}

function rgbToCssString({r,g,b}){
    return `rgb(${r}, ${g}, ${b})`
}

function sortColors(colors){
    return colors.sort((colorA, colorB) => {
        const cssColorA = rgbToCssString(colorA)
        const cssColorB = rgbToCssString(colorB)
         
        return colorSort.sortFn(cssColorA, cssColorB)
    })
}

async function htmlToImage(html, url){

    let {data} = await axios.get(url, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(data).toString('base64');
    const dataURI = 'data:image/jpeg;base64,' + base64Image
    return nodeHtmlToImage({
        output: './image.png',
        html,
        content: { imageSource: dataURI }
      })
}


async function generateImagePalette({url, palette, name}){
    const colors = palette.map(color => `rgb(${color.r}, ${color.g}, ${color.b})`)
    const colorPalleteDiv = (rgb) => `
    <div style="background-color: ${rgb}; flex: 1; height: 90px;" >
    </div>
    `

    const colorsPaletteDivAll = colors.map(c => colorPalleteDiv(c)).join("")

    const imageDiv = `
    <div>
    <div>@MoonViesMe</div>
    <img style="width: 100%;" src="{{imageSource}}" alt="" />
    <div style="display: flex;">
    ${colorsPaletteDivAll}
    </div>
    `
    const res = await htmlToImage(imageDiv, url)
    return res
}

function getRgbFromPallete(pallete){
    const rgb = pallete.map(p => {
        return {
            r: p[0],
            g: p[1],
            b: p[2]
        }
    })
    return rgb
}

module.exports = {getColorPalleteByUrl, getRgbFromPallete, sortColors, generateImagePalette}


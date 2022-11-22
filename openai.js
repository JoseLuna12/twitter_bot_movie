const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



async function resumeMovie(text) {
    const completion = await openai.createCompletion({
        model: "text-davinci-002",
        prompt: `hello world`,
    });
    return completion.data.choices[0].text
}

module.exports = { resumeMovie };
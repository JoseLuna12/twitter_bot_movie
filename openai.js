const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



async function resumeMovie(movieName, text) {
    // console.log({ text })
    if (text) {
        const completion = await openai.createCompletion({
            model: "text-curie-001",
            prompt: `Sumarize this on one sentence:\n${text}`,
            temperature: 0,
            max_tokens: 60,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0
        });
        return completion.data.choices[0].text?.trim() || ""
    }
    return ""
}

module.exports = { resumeMovie };
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

exports.fetchGeminiResponse = async function fetchGeminiResponse(text) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });
    const result = await model.generateContent(text);
    const response = result.response;
    return response.text().replace(/\*\*/g, "*");
}
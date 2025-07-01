async function fetchGeminiResponse(text, system) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    let prompt = `berikan roasting singkat dengan kejam, menyindir, sarkas, serta menyakitkan dalam bahasa gaul untuk profile instagram berikut : ${username}. Berikut detailnya: "${JSON.stringify(dataExtract)}"`;
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
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().replace(/\*\*/g, "*");
}
const axios = require('axios');
const { keyApi } = require('../config');

exports.metaLlama = async (messages) => {
    return new Promise((resolve, reject) => {
        const model = "meta-llama/Llama-3.3-70B-Instruct";
        const endpoint = "https://api.deepinfra.com/v1/openai/chat/completions";
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${keyApi}`,
            },
            body: JSON.stringify({ model, messages }),
        })
        .then(r => r.json())
        .then(response => {
            resolve(response);
        })
        .catch(err => {
            console.log(err)
            reject(`Http error!`);
        })
    })
}
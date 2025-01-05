from flask import Flask, request, jsonify
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

app = Flask(__name__)

# Memuat model dan tokenizer
# tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.3-70B-Instruct")

model_id = "meta-llama/Llama-3.3-70B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)
# model = AutoModelForCausalLM.from_pretrained(model_id, device_map="auto", torch_dtype=torch.bfloat16)

@app.route('/completions', methods=['POST'])
def completions():
    data = request.json
    messages = data.get('messages', [])
    max_tokens = data.get('max_tokens', 50)

    # Menyusun input dari pesan
    prompt = ""
    for message in messages:
        role = message.get('role')
        content = message.get('content')
        if role == 'system':
            prompt += f"[SYSTEM] {content}\n"
        elif role == 'user':
            prompt += f"[USER] {content}\n"
        elif role == 'assistant':
            prompt += f"[ASSISTANT] {content}\n"

    # Tokenisasi input
    inputs = tokenizer(prompt, return_tensors='pt').to('cuda')

    # Menghasilkan output dari model
    output = model.generate(**inputs, max_new_tokens=max_tokens)
    response = tokenizer.decode(output[0], skip_special_tokens=True)

    return jsonify({'completion': response})

if __name__ == '__main__':
    app.run(debug=True)
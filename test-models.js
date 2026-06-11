const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const geminiKey = env['GEMINI_API_KEY'];
const ai = new GoogleGenAI({ apiKey: geminiKey });

async function run() {
  console.log('Listing available models for this API key...');
  try {
    const list = await ai.models.list();
    console.log('Raw response:', JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('Failed to list models:', err.message || err);
  }
}

run();

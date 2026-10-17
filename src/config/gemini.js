
const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.api_key;

if (!apiKey) {
  throw new Error("api_key is missing from environment variables");
}

const gemini = new GoogleGenAI({ apiKey });

const GEMINI_MODEL = process.env.GEMINI_MODEL;

module.exports = { gemini, GEMINI_MODEL };

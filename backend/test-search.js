require('dotenv').config({ path: '/Users/joaolucas/mutual-fund-calculator-1/backend/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [{ googleSearch: {} }]
});
async function run() {
  try {
    const response = await model.generateContent('Why did SPY fall today?');
    console.log(response.response.text());
    console.log(response.response.candidates[0].groundingMetadata ? 'HAS GROUNDING' : 'NO GROUNDING');
  } catch(e) { console.error(e.message); }
}
run();

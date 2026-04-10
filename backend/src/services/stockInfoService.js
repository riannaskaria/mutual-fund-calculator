const { GoogleGenerativeAI } = require('@google/generative-ai');

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey);
}

const STOCK_PROFILE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sector: { type: "STRING" },
    industry: { type: "STRING" },
    country: { type: "STRING" },
    website: { type: "STRING" },
    employees: { type: "NUMBER" },
    objective: { type: "STRING" },
    strategy: { type: "STRING" },
    risks: { type: "STRING" },
    notes: { type: "STRING" },
    marketCap: { type: "NUMBER" },
    beta: { type: "NUMBER" },
    trailingPE: { type: "NUMBER" },
    forwardPE: { type: "NUMBER" },
    priceToBook: { type: "NUMBER" },
    bookValue: { type: "NUMBER" },
    dividendYield: { type: "NUMBER" },
    earningsGrowth: { type: "NUMBER" },
    revenueGrowth: { type: "NUMBER" },
    returnOnEquity: { type: "NUMBER" },
    returnOnAssets: { type: "NUMBER" },
    fiftyTwoWeekHigh: { type: "NUMBER" },
    fiftyTwoWeekLow: { type: "NUMBER" },
    fiftyDayAverage: { type: "NUMBER" },
    averageVolume: { type: "NUMBER" }
  },
  required: ["objective", "strategy", "risks", "notes", "sector"]
};

/**
 * Fetches rich stock/ETF/fund data via Gemini 2.5 Flash with Google Search grounding.
 * Bypasses Yahoo Finance crumb blocks entirely and formats exactly for the UI.
 * @param {string} ticker
 * @returns {Promise<object>}
 */
async function fetchStockInfo(ticker) {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: STOCK_PROFILE_SCHEMA
    }
  });

  const prompt = `Use Google Search to fetch the latest current live financial data and company profile for the ticker symbol: ${ticker}.

Fill out the JSON schema precisely. 
For "objective": Write a concise Investment Objective (1-2 sentences).
For "strategy": Write the Strategy & Approach or Business Overview (2-3 sentences).
For "risks": Write the primary Risk Considerations for this specific asset (2-3 sentences).
For "notes": Write brief Notes (founding date, notable managers, or general context).

For financial numbers, use real numbers (e.g., 3000000000000 for 3T, 0.05 for 5% dividend yield, 0.12 for 12% revenue growth). If a specific financial metric is strictly inapplicable (like PE ratio for an index), leave it null or 0.`;

  try {
    const result = await model.generateContent(prompt);
    const jsonText = result.response.text();
    return JSON.parse(jsonText);
  } catch (err) {
    console.error(`[stockInfoService] Gemini fetch fail for ${ticker}:`, err.message);
    throw err;
  }
}

module.exports = { fetchStockInfo };

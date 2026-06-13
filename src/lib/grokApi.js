// src/lib/grokApi.js - Improved Grok xAI API integration
export const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY; // Set in .env or Base44 secrets

export async function callGrok(prompt, context = {}) {
  if (!GROK_API_KEY) {
    console.warn('Grok API key not set. Using simulated response.');
    return `Simulated Grok analysis for: ${prompt}. High conviction setup detected.`;
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta', // or latest model
        messages: [
          { role: 'system', content: 'You are a sharp options and stock trading analyst. Provide concise, high-conviction trade theses with risk/reward.' },
          { role: 'user', content: prompt + JSON.stringify(context) }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Grok API call failed:', error);
    return 'Grok API unavailable. Falling back to local analysis.';
  }
}

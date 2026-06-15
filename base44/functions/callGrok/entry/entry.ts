import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'XAI_API_KEY not configured' }, { status: 500 });
    }

    const systemPrompt = 'You are a sharp options and stock trading analyst. Provide concise, high-conviction trade theses with risk/reward.';

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.3-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt + (context ? '\n\nContext: ' + JSON.stringify(context) : '') }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('xAI API error status:', response.status, 'body:', responseText);
      return Response.json({ error: 'xAI API error: ' + responseText }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || '';

    return Response.json({ content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
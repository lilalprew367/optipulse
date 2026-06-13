// Improved Grok Agent Chat Component with xAI API integration stub
import React, { useState } from 'react';

export default function GrokAgentChat({ ticker = '', onThesisGenerated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Replace with real xAI Grok API call
      // const response = await fetch('https://api.x.ai/v1/chat/completions', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ model: 'grok-beta', messages: [...messages, userMessage] })
      // });

      // Simulate for now + real integration later
      const simulatedResponse = `Grok Analysis for ${ticker || 'market'}: High conviction options play detected with strong flow. R:R 1:4. Recommend long calls.`;
      const assistantMessage = { role: 'assistant', content: simulatedResponse };
      setMessages(prev => [...prev, assistantMessage]);

      if (onThesisGenerated) onThesisGenerated(simulatedResponse);
    } catch (error) {
      console.error('Grok API error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 h-96 flex flex-col">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div>Thinking with Grok...</div>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-gray-800 p-3 rounded"
          placeholder="Ask Grok: Analyze AAPL flow..."
        />
        <button onClick={sendMessage} disabled={isLoading} className="bg-green-600 px-6 py-2 rounded">Send</button>
      </div>
    </div>
  );
}

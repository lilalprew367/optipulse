import React, { useState } from 'react';

export default function GrokAgentChat({ ticker = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Integrate with xAI Grok API or Base44 function
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, ticker }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to Grok. Please try again.' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-900 text-white h-[500px] flex flex-col">
      <div className="font-bold mb-4">Grok Trading Agent</div>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="text-center">Thinking...</div>}
      </div>
      <div className="flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 p-3 bg-gray-800 border rounded text-white"
          placeholder="Ask Grok: Analyze this options flow..."
        />
        <button onClick={sendMessage} disabled={isLoading} className="bg-green-600 px-6 py-3 rounded hover:bg-green-700">
          Send
        </button>
      </div>
    </div>
  );
}

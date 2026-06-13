// Updated GrokAgentChat with real API integration
import React, { useState } from 'react';
import { callGrok } from '../lib/grokApi';

export default function GrokAgentChat({ ticker, signalData, onThesisGenerated }) {
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
      const context = { ticker, signalData };
      const grokResponse = await callGrok(input, context);
      const assistantMsg = { role: 'assistant', content: grokResponse };
      setMessages(prev => [...prev, assistantMsg]);
      if (onThesisGenerated) onThesisGenerated(grokResponse);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error contacting Grok.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[500px] flex flex-col border border-gray-700 rounded-xl overflow-hidden bg-gray-950">
      <div className="p-4 border-b bg-gray-900">Grok Trading Analyst</div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && <p className="text-gray-400 text-center">Ask Grok about any ticker or signal...</p>}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user' ? 'ml-auto bg-blue-600' : 'bg-zinc-800'}`}>
            {m.content}
          </div>
        ))}
        {isLoading && <div className="text-green-400">Grok thinking...</div>}
      </div>
      <div className="p-4 border-t bg-gray-900 flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="E.g. Analyze this options flow for NVDA" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3" />
        <button onClick={sendMessage} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-lg font-medium">Ask Grok</button>
      </div>
    </div>
  );
}

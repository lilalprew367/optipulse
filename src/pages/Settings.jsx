// Placeholder for enhanced Settings with API Key Management
import React, { useState } from 'react';

export default function Settings() {
  const [apiKeys, setApiKeys] = useState({
    unusualWhales: '',
    quiverQuant: '',
    tradingView: '',
  });

  const handleSave = () => {
    // Save to Base44 backend or localStorage
    console.log('API Keys saved:', apiKeys);
    alert('API Keys saved successfully!');
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Settings & API Keys</h1>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Unusual Whales API Key</label>
          <input type="password" value={apiKeys.unusualWhales} onChange={(e) => setApiKeys({...apiKeys, unusualWhales: e.target.value})} className="w-full p-3 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Quiver Quant API Key</label>
          <input type="password" value={apiKeys.quiverQuant} onChange={(e) => setApiKeys({...apiKeys, quiverQuant: e.target.value})} className="w-full p-3 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">TradingView API / Token</label>
          <input type="password" value={apiKeys.tradingView} onChange={(e) => setApiKeys({...apiKeys, tradingView: e.target.value})} className="w-full p-3 border rounded" />
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
          Save API Keys
        </button>
      </div>
    </div>
  );
}

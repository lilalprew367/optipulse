import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Import other pages...
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
// ... other imports

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        {/* other routes */}
      </Routes>
    </Router>
  );
}

export default App;

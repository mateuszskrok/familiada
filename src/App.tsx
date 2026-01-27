
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DisplayView } from './views/DisplayView';
import { AdminView } from './views/AdminView';
import './App.css';

const Menu: React.FC = () => {
  return (
    <div className="menu-container" style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Familiada App</h1>
      <div className="button-group" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link to="/display" className="btn-main">
          <button style={{ padding: '20px', fontSize: '1.2rem' }}>Widok Ekranu (TV)</button>
        </Link>
        <Link to="/admin" className="btn-main admin">
          <button style={{ padding: '20px', fontSize: '1.2rem' }}>Panel Prowadzącego</button>
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/display" element={<DisplayView />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </Router>
  );
}

export default App;
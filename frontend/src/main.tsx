import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyStoredZoom } from './store/zoomStore';

// Apply persisted zoom before first render to avoid flash
applyStoredZoom();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

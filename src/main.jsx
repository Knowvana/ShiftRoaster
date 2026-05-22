/**
 * ============================================================================
 * Main Entry Point — Shift Roster App
 * 
 * This file mounts the React application into the DOM.
 * It wraps the App component with React.StrictMode for development checks.
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Create the root element and render the app
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

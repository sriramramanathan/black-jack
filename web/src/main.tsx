import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// ReactDOM.createRoot is the React 18 way to mount the app.
// The '!' tells TypeScript "trust me, this element exists" (non-null assertion).
ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode renders components twice in development to catch side effects.
  // This is helpful for learning — it surfaces bugs that lazy rendering would hide.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

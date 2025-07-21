import React from 'react';
import ReactDOM from 'react-dom/client';
import ControleFinanceiro from './App'; // já que App.js virou seu componente

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ControleFinanceiro />
  </React.StrictMode>
);

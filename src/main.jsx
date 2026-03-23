import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PaginaCliente from './PaginaCliente.jsx'
import PaginaAdmin from './PaginaAdmin.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaCliente />} />
        <Route path="/admin" element={<PaginaAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

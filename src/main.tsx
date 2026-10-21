import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import faviconUrl from '../assets/denr-favicon-64.png'

// Keep the DENR mark in the browser tab. Importing the asset lets Vite embed it
// directly in the single-file build, so the standalone HTML keeps its icon.
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.sizes = '64x64'
favicon.href = faviconUrl
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

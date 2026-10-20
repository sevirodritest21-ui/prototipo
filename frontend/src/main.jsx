import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initNetworkResilience } from './services/network'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './services/queries'

initNetworkResilience()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

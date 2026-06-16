// Buffer polyfill — must be the FIRST import so it runs before any Solana code
// (wallet adapters touch a global `Buffer` at module-eval time). See polyfills.ts.
import './polyfills'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)

import { Buffer } from 'buffer'
// Solana web3.js, spl-token, and the wallet adapters expect a global `Buffer`.
// Vite externalizes Node's buffer for the browser, so polyfill it before any
// Solana code runs.
const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer }
if (!g.Buffer) g.Buffer = Buffer

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

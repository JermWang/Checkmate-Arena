// Buffer polyfill — MUST run before any Solana web3.js / wallet-adapter code.
//
// ES module imports are hoisted and evaluated in source order *before* any
// statements in the importing module's body. The Solana wallet adapters touch a
// global `Buffer` at module-evaluation time, so setting `globalThis.Buffer`
// inside main.tsx (after its imports) runs too late and the app crashes with
// "Buffer is not defined". Keeping the shim in its own module and importing it
// as the very first import in main.tsx guarantees it executes first.
import { Buffer } from "buffer";

const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;

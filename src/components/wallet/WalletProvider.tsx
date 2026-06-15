import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface WalletContextType {
  walletAddress: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  isEligible: boolean | null;
  tokenBalance: number;
  checkEligibility: () => Promise<boolean | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Auto-restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("checkmate_wallet");
    if (saved) {
      setWalletAddress(saved);
      setConnected(true);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      // Mock wallet connection — in production uses Solana Wallet Adapter
      await new Promise((r) => setTimeout(r, 800));
      const mockAddress = "CM" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setWalletAddress(mockAddress);
      setConnected(true);
      localStorage.setItem("checkmate_wallet", mockAddress);

      // Check eligibility
      await checkEligibilityForAddress(mockAddress);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setConnected(false);
    setIsEligible(null);
    setTokenBalance(0);
    localStorage.removeItem("checkmate_wallet");
  }, []);

  const checkEligibilityForAddress = async (address: string): Promise<boolean | null> => {
    try {
      const res = await fetch("/api/trpc/eligibility.check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { walletAddress: address } }),
      });
      const data = await res.json();
      if (data.result?.data) {
        setIsEligible(data.result.data.isEligible);
        setTokenBalance(data.result.data.tokenBalance);
        return data.result.data.isEligible;
      }
      setIsEligible(false);
      return false;
    } catch {
      setIsEligible(false);
      return false;
    }
  };

  const checkEligibility = useCallback(async () => {
    if (walletAddress) {
      return checkEligibilityForAddress(walletAddress);
    }
    return null;
  }, [walletAddress]);

  return (
    <WalletContext.Provider
      value={{ walletAddress, connected, connecting, connect, disconnect, isEligible, tokenBalance, checkEligibility }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

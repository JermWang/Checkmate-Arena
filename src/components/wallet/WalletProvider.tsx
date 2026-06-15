import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

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

const SOLANA_ENDPOINT = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");

export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => SOLANA_ENDPOINT, []);
  const wallets = useMemo<Adapter[]>(() => [], []);

  const handleWalletError = useCallback((error: WalletError) => {
    console.error("Solana wallet error:", error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect onError={handleWalletError}>
        <WalletModalProvider>
          <WalletStateProvider>{children}</WalletStateProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

function WalletStateProvider({ children }: { children: ReactNode }) {
  const {
    publicKey,
    connected,
    connecting,
    wallet,
    connect: connectSelectedWallet,
    disconnect: disconnectSelectedWallet,
  } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);

  const walletAddress = publicKey?.toBase58() ?? null;

  const connect = useCallback(async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }

    try {
      await connectSelectedWallet();
    } catch (error) {
      console.error("Unable to connect selected Solana wallet:", error);
      setVisible(true);
    }
  }, [connectSelectedWallet, setVisible, wallet]);

  const disconnect = useCallback(() => {
    void disconnectSelectedWallet();
  }, [disconnectSelectedWallet]);

  const checkEligibilityForAddress = useCallback(async (address: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/trpc/eligibility.check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { walletAddress: address } }),
      });
      const data = await res.json();
      const result = data.result?.data;
      if (result) {
        setTokenBalance(result.tokenBalance);
      }
    } catch (error) {
      console.warn("Eligibility sync failed; token gate is currently disabled.", error);
    }

    setIsEligible(true);
    return true;
  }, []);

  const checkEligibility = useCallback(async () => {
    if (!walletAddress) return null;
    return checkEligibilityForAddress(walletAddress);
  }, [checkEligibilityForAddress, walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setIsEligible(null);
      setTokenBalance(0);
      return;
    }

    setIsEligible(true);
    void checkEligibilityForAddress(walletAddress);
  }, [checkEligibilityForAddress, walletAddress]);

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

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
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
  isGuest: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

const SOLANA_ENDPOINT = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");
const ALLOW_GUEST = import.meta.env.VITE_ALLOW_GUEST_WALLET === "true";
const GUEST_STORAGE_KEY = "checkmate.guestWallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => SOLANA_ENDPOINT, []);
  // Phantom & Solflare register via the Wallet Standard automatically; listing
  // the adapters explicitly keeps legacy/in-app browsers working too.
  const wallets = useMemo<Adapter[]>(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

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

  // ── Guest wallet (dev/testing only) ───────────────────────────
  // Honor an existing dev guest session without making the public Connect
  // Wallet button create one.
  const [guestAddress, setGuestAddress] = useState<string | null>(() => {
    if (!ALLOW_GUEST || typeof window === "undefined") return null;
    return sessionStorage.getItem(GUEST_STORAGE_KEY);
  });

  const realWalletAddress = publicKey?.toBase58() ?? null;
  const walletAddress = realWalletAddress ?? guestAddress;
  const isGuest = !realWalletAddress && !!guestAddress;
  const isConnected = connected || isGuest;

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
    if (guestAddress) {
      sessionStorage.removeItem(GUEST_STORAGE_KEY);
      setGuestAddress(null);
    }
    void disconnectSelectedWallet();
  }, [disconnectSelectedWallet, guestAddress]);

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
        setTokenBalance(result.tokenBalance ?? 0);
        // Respect the server's verdict. Missing/undefined => treat as eligible
        // (gate disabled or pre-launch) so we never lock players out by accident.
        const eligible = result.isEligible !== false;
        setIsEligible(eligible);
        return eligible;
      }
    } catch (error) {
      // On any failure, fail OPEN — a flaky RPC/DB must not block ranked play.
      console.warn("Eligibility sync failed; allowing play.", error);
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
      value={{ walletAddress, connected: isConnected, connecting, connect, disconnect, isEligible, tokenBalance, checkEligibility, isGuest }}
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

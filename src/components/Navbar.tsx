import { Link, useLocation } from "react-router";
import { useWallet } from "./wallet/WalletProvider";
import { Trophy, Swords, Gift, Shield, Wallet, LogOut, User, Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { walletAddress, connected, connect, disconnect } = useWallet();
  useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Swords className="w-5 h-5 text-[#14F195]" />
          <span className="text-sm font-medium tracking-widest uppercase text-white">
            Checkmate Arena
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={isActive("/")} icon={<Swords className="w-4 h-4" />} label="Arena" />
          <NavLink to="/play" active={isActive("/play")} icon={<Swords className="w-4 h-4" />} label="Play" />
          <NavLink to="/lobby" active={location.pathname.startsWith("/lobby")} icon={<Coins className="w-4 h-4" />} label="Lobby" />
          <NavLink to="/leaderboard" active={isActive("/leaderboard")} icon={<Trophy className="w-4 h-4" />} label="Leaderboard" />
          <NavLink to="/rewards" active={isActive("/rewards")} icon={<Gift className="w-4 h-4" />} label="Rewards" />
          <NavLink to="/admin" active={isActive("/admin")} icon={<Shield className="w-4 h-4" />} label="Admin" />
        </div>

        {/* Wallet + Auth */}
        <div className="flex items-center gap-3">
          {connected && walletAddress ? (
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${walletAddress}`}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </Link>
              <button
                onClick={disconnect}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white hover:text-black transition-all duration-300"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

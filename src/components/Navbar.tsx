import { Link, useLocation } from "react-router";
import { useWallet } from "./wallet/WalletProvider";
import { Trophy, Swords, Gift, Wallet, LogOut, Coins, House } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { avatarUrl, displayName } from "@/lib/profile";

export default function Navbar() {
  const { walletAddress, connected, connect, disconnect, isGuest } = useWallet();
  useAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const { data: profile } = trpc.profile.get.useQuery(
    { walletAddress: walletAddress! },
    { enabled: !!walletAddress, staleTime: 1000 * 60 }
  );

  const isActive = (path: string) => location.pathname === path;
  const navItems = [
    { to: "/", active: isActive("/"), icon: <House className="w-4 h-4" />, label: "Home" },
    { to: "/play", active: isActive("/play"), icon: <Swords className="w-4 h-4" />, label: "Play" },
    { to: "/lobby", active: location.pathname.startsWith("/lobby"), icon: <Coins className="w-4 h-4" />, label: "Lobby" },
    { to: "/leaderboard", active: isActive("/leaderboard"), icon: <Trophy className="w-4 h-4" />, label: "Leaderboard" },
    { to: "/rewards", active: isActive("/rewards"), icon: <Gift className="w-4 h-4" />, label: "Rewards" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md ${
          isLanding ? "border-b border-transparent" : "border-b border-white/5"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex min-w-0 items-center gap-2 group">
            <Swords className="w-5 h-5 shrink-0 text-[#14F195]" />
            <span className="hidden min-[360px]:inline truncate text-sm font-medium tracking-widest uppercase text-white">
              Checkmate Arena
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
          </div>

          {/* Wallet + Auth */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {connected && walletAddress ? (
              <div className="flex items-center gap-2">
                {isGuest && (
                  <span className="hidden sm:inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-yellow-300">
                    Guest
                  </span>
                )}
                <Link
                  to={`/profile/${walletAddress}`}
                  className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 transition-colors"
                >
                  <img
                    src={avatarUrl(profile?.avatar, walletAddress)}
                    alt=""
                    className="w-6 h-6 rounded-full bg-white/10"
                  />
                  <span className="max-w-[120px] truncate">{displayName(profile?.username, walletAddress)}</span>
                </Link>
                <Link
                  to={`/profile/${walletAddress}`}
                  aria-label="Open profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 sm:hidden"
                >
                  <img
                    src={avatarUrl(profile?.avatar, walletAddress)}
                    alt=""
                    className="h-7 w-7 rounded-full bg-white/10"
                  />
                </Link>
                <button
                  onClick={disconnect}
                  aria-label="Disconnect wallet"
                  className="p-2 sm:p-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                aria-label="Connect wallet"
                className="flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-white/20 px-0 text-xs font-medium text-white transition-all duration-300 hover:bg-white hover:text-black sm:w-auto sm:px-4"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <nav
        aria-label="Primary mobile navigation"
        className={`fixed bottom-0 left-0 right-0 z-50 w-screen max-w-full overflow-hidden bg-[#050505]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden ${
          isLanding ? "border-t border-transparent" : "border-t border-white/10"
        }`}
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => (
            <MobileNavLink key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </>
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

function MobileNavLink({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useWallet } from "@/components/wallet/WalletProvider";
import {
  Check,
  Copy,
  Swords,
  Shield,
  Clock,
  Zap,
  ChevronRight,
  Coins,
  Lock,
  Trophy,
} from "lucide-react";
import { Hero3D } from "@/components/three/Hero3D";
import { CHESS_MINT } from "@/config/wager";
import { useArenaStats } from "@/providers/arenaStats";

const steps = [
  {
    number: "01",
    title: "Connect Wallet",
    description: "Connect a real Solana wallet to enter the arena.",
    icon: <Shield className="size-5 text-[#E6B84F]" />,
  },
  {
    number: "02",
    title: "Hold 10K $CHESS",
    description: "Holding 10,000 $CHESS unlocks ranked, then join the matchmaking queue.",
    icon: <Coins className="size-5 text-[#E6B84F]" />,
  },
  {
    number: "03",
    title: "Win Matches",
    description: "Play rated 5-minute games. Win to climb the daily leaderboard.",
    icon: <Zap className="size-5 text-[#E6B84F]" />,
  },
  {
    number: "04",
    title: "Earn Rewards",
    description: "Top 10 players split 50% of creator fees every 24 hours.",
    icon: <Clock className="size-5 text-[#E6B84F]" />,
  },
];

const rewards = [
  { rank: "1st", percentage: "25%", description: "Top player takes the throne.", highlight: true },
  { rank: "2nd", percentage: "18%", description: "Runner up still cashes in." },
  { rank: "3rd", percentage: "14%", description: "Bronze pays the bills." },
  { rank: "4th", percentage: "10%", description: "Solid reward for skill." },
  { rank: "5th", percentage: "8%", description: "Top half gets paid." },
  { rank: "6th", percentage: "7%", description: "Consistency rewarded." },
  { rank: "7th", percentage: "6%", description: "Keep grinding." },
  { rank: "8th-10th", percentage: "4-3%", description: "Even top 10 earns." },
];

function shortContractAddress(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default function Home() {
  const { connected } = useWallet();
  const arena = useArenaStats();
  const [copiedContract, setCopiedContract] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const copyContractAddress = async () => {
    try {
      await navigator.clipboard.writeText(CHESS_MINT);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = CHESS_MINT;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedContract(true);
    window.setTimeout(() => setCopiedContract(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-['Space_Grotesk',sans-serif]">
      <div className="landing-atmosphere landing-atmosphere--intro">
        <section
          ref={heroRef}
          className="landing-hero landing-section relative flex min-h-[92svh] items-center overflow-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-8"
        >
          <div className="relative z-10 mx-auto grid w-full max-w-[1180px] items-center gap-7 lg:grid-cols-[0.82fr_1fr] lg:gap-12">
            <div
              className="relative order-1 mx-auto aspect-square w-full max-w-[230px] sm:max-w-[280px] md:max-w-[330px] lg:order-2 lg:max-w-[430px]"
              style={{ transform: `translateY(${Math.min(scrollY * 0.035, 18)}px)` }}
            >
              <div className="absolute inset-2 rounded-full bg-[#E6B84F]/[0.11] blur-[64px]" />
              <div className="absolute inset-x-10 top-10 bottom-16 rounded-full bg-[#B8860B]/[0.13] blur-[44px]" />
              <Hero3D
                pieceKey="wN"
                png="/hero-knight.png"
                alt="Chess Knight"
                pieceHeight={2.75}
                className="relative size-full drop-shadow-[0_30px_92px_rgba(230, 184, 79,0.34)]"
              />
            </div>

            <div className="order-2 mx-auto max-w-[720px] text-center lg:order-1 lg:mx-0 lg:text-left">
              <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-[#8A8F98]">
                Ranked chess on Solana
              </p>
              <h1 className="text-4xl font-bold leading-[0.96] tracking-normal sm:text-5xl md:text-6xl lg:text-7xl">
                Enter the
                <span className="block text-[#E6B84F]">King of Games</span>
              </h1>
              <p className="mx-auto mt-5 max-w-[560px] text-base leading-7 text-[#A6ABB4] sm:text-lg lg:mx-0">
                Hold 10,000 $CHESS to enter ranked matchmaking, chase the daily leaderboard,
                or opt into escrow-backed $CHESS wagers.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/play"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#E6B84F] px-6 text-sm font-semibold text-black transition-colors hover:bg-[#E6B84F]/90"
                >
                  <Swords className="size-4" />
                  Play Ranked
                  <ChevronRight className="size-4" />
                </Link>
                <Link
                  to="/leaderboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  <Trophy className="size-4" />
                  View Leaderboard
                </Link>
                <button
                  type="button"
                  onClick={copyContractAddress}
                  aria-label={`Copy contract address ${CHESS_MINT}`}
                  title={CHESS_MINT}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#E6B84F]/35 px-5 text-sm font-medium text-[#E6B84F] transition-colors hover:bg-[#E6B84F]/10"
                >
                  {copiedContract ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="font-mono">
                    {copiedContract ? "Copied" : `Contract: ${shortContractAddress(CHESS_MINT)}`}
                  </span>
                </button>
              </div>

              <Link
                to="/play"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-[#A6ABB4] transition-colors hover:border-[#E6B84F]/30 hover:text-white"
              >
                <span className="relative flex h-2 w-2">
                  {arena.live && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E6B84F] opacity-70" />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${arena.live ? "bg-[#E6B84F]" : "bg-[#8A8F98]"}`} />
                </span>
                <span className="font-mono tabular-nums text-white">{arena.inQueue}</span>
                in queue
                <span className="text-white/15">·</span>
                <span className="font-mono tabular-nums text-white">{arena.online}</span>
                online
                {arena.liveMatches > 0 && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="font-mono tabular-nums text-white">{arena.liveMatches}</span>
                    live
                  </>
                )}
              </Link>

              <p className="mt-8 text-[11px] uppercase tracking-[0.26em] text-[#666C76]">
                Powered by Solana
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section landing-panel px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <SectionHeader
              eyebrow="Arena loop"
              title="How It Works"
              description="A compact path from wallet connection to ranked play and rewards."
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <StepCard key={step.number} {...step} />
              ))}
            </div>
          </div>
        </section>

        <PieceFeature
          label="Position"
          title="Every move has weight."
          copy="The board stays fast and readable while the backend records the match, validates moves, and updates ratings."
          pieceKey="wK"
          png="/king-piece.png"
          alt="King Piece"
          align="left"
          offset={scrollY}
        />

        <PieceFeature
          label="Leverage"
          title="Skill is your edge."
          copy="Hold $CHESS to play ranked, then step into public challenges or private rooms when you want bigger stakes on the board."
          pieceKey="wQ"
          png="/queen-piece.png"
          alt="Queen Piece"
          align="right"
          offset={scrollY}
        />
      </div>

      <section className="landing-rewards landing-section px-4 py-16 text-white sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeader
            eyebrow="Daily pool"
            title="Reward Rankings"
            description="50% of daily creator fees distributed to top players."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rewards.map((reward) => (
              <RewardCard key={reward.rank} {...reward} />
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-full bg-white/10">
            <div className="flex h-3">
              <div className="bg-[#E6B84F]" style={{ width: "25%" }} />
              <div className="bg-[#C9A227]" style={{ width: "18%" }} />
              <div className="bg-[#27aee4]" style={{ width: "14%" }} />
              <div className="bg-[#B8860B]" style={{ width: "10%" }} />
              <div className="bg-[#9ca3af]" style={{ width: "33%" }} />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-[#8A8F98]">
            <span>1st: 25%</span>
            <span>Total Pool: 100%</span>
          </div>
        </div>
      </section>

      <div className="landing-atmosphere landing-atmosphere--closing">
        <section className="landing-section px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-[980px]">
            <SectionHeader
              eyebrow="Opt-in $CHESS"
              title="Or play for keeps."
              description="Ranked is unlocked by holding 10,000 $CHESS. If you want stakes on the board, the lobby has public challenges and private rooms. Pots settle on-chain in $CHESS."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <ModeCard
                to="/lobby"
                icon={<Coins className="size-7 text-[#E6B84F]" />}
                title="Public lobby"
                description="Browse open challenges. Snap-to-tier stakes from 100 up to 100,000 $CHESS. Accept any challenge to lock matching stakes."
                action="Open lobby"
              />
              <ModeCard
                to="/lobby/private"
                icon={<Lock className="size-7 text-[#E6B84F]" />}
                title="Private room"
                description="Generate a single-use 6-character code for friends, streams, and brackets. No public listing, 15-minute expiry."
                action="Create room"
              />
            </div>

            <p className="mt-7 text-center text-xs text-[#8A8F98]">
              Winner takes the pot minus a 2% house fee. Players pay their own network gas.
              50% of the house fee feeds the weekly leaderboard pool.
            </p>
          </div>
        </section>

        <section className="landing-section landing-panel px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <Shield className="mx-auto mb-5 size-10 text-[#E6B84F]" />
            <h2 className="text-3xl font-bold leading-tight tracking-normal md:text-4xl">
              Server-Validated. Anti-Cheat Protected.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#A6ABB4] md:text-lg">
              Every ranked match runs on our authoritative server with chess.js move validation.
              Suspicious activity is flagged and reviewed before rewards are distributed.
            </p>
            <Link
              to="/play"
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#E6B84F] px-6 text-sm font-semibold text-[#E6B84F] transition-colors hover:bg-[#E6B84F] hover:text-black"
            >
              <Swords className="size-4" />
              {connected ? "Play Now" : "Join the Arena"}
            </Link>
          </div>
        </section>

        <footer className="landing-section landing-panel px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-2">
              <Swords className="size-4 text-[#E6B84F]" />
              <span className="text-xs uppercase tracking-[0.24em] text-[#8A8F98]">
                Checkmate Arena
              </span>
            </div>
            <p className="text-xs text-[#8A8F98]">
              Ranked chess on Solana. Hold 10,000 $CHESS to play ranked; wagering is opt-in.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  dark = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <div className="mx-auto max-w-[720px] text-center">
      <p className={`text-[11px] uppercase tracking-[0.26em] ${dark ? "text-[#8A8F98]" : "text-[#66717D]"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-normal md:text-5xl">
        {title}
      </h2>
      <p className={`mt-3 text-sm leading-6 md:text-base ${dark ? "text-[#A6ABB4]" : "text-[#66717D]"}`}>
        {description}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.025] p-5 transition-colors hover:border-[#E6B84F]/20 hover:bg-white/[0.05]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-[#8A8F98]">{number}</span>
        <div className="rounded-md bg-white/5 p-2">{icon}</div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#A6ABB4]">{description}</p>
    </div>
  );
}

function PieceFeature({
  label,
  title,
  copy,
  pieceKey,
  png,
  alt,
  align,
  offset,
}: {
  label: string;
  title: string;
  copy: string;
  pieceKey: string;
  png: string;
  alt: string;
  align: "left" | "right";
  offset: number;
}) {
  const content = (
    <div className="max-w-[500px] text-center md:text-left">
      <p className="text-[11px] uppercase tracking-[0.26em] text-[#8A8F98]">{label}</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-normal md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#A6ABB4]">{copy}</p>
    </div>
  );

  const piece = (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px] sm:max-w-[330px] lg:max-w-[390px]">
      <div className="absolute inset-x-6 top-10 bottom-10 rounded-full bg-[#E6B84F]/[0.07] blur-[56px]" />
      <div className="absolute inset-x-10 top-12 bottom-16 rounded-full bg-[#B8860B]/[0.09] blur-[44px]" />
      <div
        className="relative size-full"
        style={{ transform: `translateY(${-Math.min(offset * 0.012, 18)}px)` }}
      >
      <Hero3D
        pieceKey={pieceKey}
        png={png}
        alt={alt}
        pieceHeight={pieceKey.endsWith("Q") ? 2.3 : 2.55}
        className="size-full drop-shadow-[0_24px_70px_rgba(230, 184, 79,0.16)]"
      />
      </div>
    </div>
  );

  return (
    <section className="landing-section landing-panel overflow-hidden px-4 py-16 sm:px-6 md:py-20 lg:px-8">
      <div className="mx-auto grid max-w-[1080px] items-center gap-8 md:grid-cols-2">
        {align === "left" ? (
          <>
            {piece}
            {content}
          </>
        ) : (
          <>
            <div className="md:order-2">{piece}</div>
            <div className="md:order-1">{content}</div>
          </>
        )}
      </div>
    </section>
  );
}

function RewardCard({
  rank,
  percentage,
  description,
  highlight,
}: {
  rank: string;
  percentage: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 transition-colors ${highlight ? "border-[#E6B84F]/45 bg-[#E6B84F]/10" : "border-white/5 bg-white/[0.025] hover:border-[#E6B84F]/25 hover:bg-white/[0.05]"}`}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className={`text-xl font-bold ${highlight ? "text-[#E6B84F]" : "text-white"}`}>{rank}</span>
        <span className="text-2xl font-bold">{percentage}</span>
      </div>
      <p className="text-sm leading-6 text-[#A6ABB4]">{description}</p>
    </div>
  );
}

function ModeCard({
  to,
  icon,
  title,
  description,
  action,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-white/5 bg-white/[0.025] p-6 transition-colors hover:border-[#E6B84F]/30 hover:bg-white/[0.05]"
    >
      {icon}
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#A6ABB4]">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#E6B84F] transition-all group-hover:gap-2">
        {action}
        <ChevronRight className="size-3" />
      </span>
    </Link>
  );
}

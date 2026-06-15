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

const steps = [
  {
    number: "01",
    title: "Connect Wallet",
    description: "Connect a real Solana wallet to enter the arena.",
    icon: <Shield className="size-5 text-[#14F195]" />,
  },
  {
    number: "02",
    title: "Enter Queue",
    description: "Connect your wallet and join the ranked matchmaking queue.",
    icon: <Swords className="size-5 text-[#14F195]" />,
  },
  {
    number: "03",
    title: "Win Matches",
    description: "Play rated 5-minute games. Win to climb the daily leaderboard.",
    icon: <Zap className="size-5 text-[#14F195]" />,
  },
  {
    number: "04",
    title: "Earn Rewards",
    description: "Top 10 players split 50% of creator fees every 24 hours.",
    icon: <Clock className="size-5 text-[#14F195]" />,
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

export default function Home() {
  const { connected } = useWallet();
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
              <div className="absolute -inset-8 rounded-full bg-[#14F195]/[0.18] blur-[72px]" />
              <div className="absolute inset-10 rounded-full bg-[#7c4dff]/[0.22] blur-[58px]" />
              <Hero3D
                pieceKey="wN"
                png="/hero-knight.png"
                alt="Chess Knight"
                pieceHeight={2.75}
                className="relative size-full drop-shadow-[0_30px_92px_rgba(20,241,149,0.34)]"
              />
            </div>

            <div className="order-2 mx-auto max-w-[720px] text-center lg:order-1 lg:mx-0 lg:text-left">
              <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-[#8A8F98]">
                Ranked chess on Solana
              </p>
              <h1 className="text-4xl font-bold leading-[0.96] tracking-normal sm:text-5xl md:text-6xl lg:text-7xl">
                Enter the
                <span className="block text-[#14F195]">King of Games</span>
              </h1>
              <p className="mx-auto mt-5 max-w-[560px] text-base leading-7 text-[#A6ABB4] sm:text-lg lg:mx-0">
                Connect your wallet to enter ranked matchmaking, chase the daily leaderboard,
                or opt into escrow-backed $CHESS wagers.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/play"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#14F195] px-6 text-sm font-semibold text-black transition-colors hover:bg-[#14F195]/90"
                >
                  <Swords className="size-4" />
                  Play
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
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#14F195]/35 px-6 text-sm font-medium text-[#14F195] transition-colors hover:bg-[#14F195]/10"
                >
                  {copiedContract ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedContract ? "Copied" : "Copy Contract"}
                </button>
              </div>

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
          copy="Play ranked for free, then step into public challenges or private rooms when you want stakes on the board."
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
              <div className="bg-[#14F195]" style={{ width: "25%" }} />
              <div className="bg-[#10c77a]" style={{ width: "18%" }} />
              <div className="bg-[#27aee4]" style={{ width: "14%" }} />
              <div className="bg-[#7c4dff]" style={{ width: "10%" }} />
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
              description="Ranked is free. If you want stakes on the board, the lobby has public challenges and private rooms. Pots settle on-chain in $CHESS."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <ModeCard
                to="/lobby"
                icon={<Coins className="size-7 text-[#14F195]" />}
                title="Public lobby"
                description="Browse open challenges. Snap-to-tier stakes from 100 up to 100,000 $CHESS. Accept any challenge to lock matching stakes."
                action="Open lobby"
              />
              <ModeCard
                to="/lobby/private"
                icon={<Lock className="size-7 text-[#14F195]" />}
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
            <Shield className="mx-auto mb-5 size-10 text-[#14F195]" />
            <h2 className="text-3xl font-bold leading-tight tracking-normal md:text-4xl">
              Server-Validated. Anti-Cheat Protected.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#A6ABB4] md:text-lg">
              Every ranked match runs on our authoritative server with chess.js move validation.
              Suspicious activity is flagged and reviewed before rewards are distributed.
            </p>
            <Link
              to="/play"
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#14F195] px-6 text-sm font-semibold text-[#14F195] transition-colors hover:bg-[#14F195] hover:text-black"
            >
              <Swords className="size-4" />
              {connected ? "Play Now" : "Join the Arena"}
            </Link>
          </div>
        </section>

        <footer className="landing-section landing-panel px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-2">
              <Swords className="size-4 text-[#14F195]" />
              <span className="text-xs uppercase tracking-[0.24em] text-[#8A8F98]">
                Checkmate Arena
              </span>
            </div>
            <p className="text-xs text-[#8A8F98]">
              Ranked chess on Solana. Ranked is free; wagering is opt-in.
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
    <div className="rounded-lg border border-white/5 bg-white/[0.025] p-5 transition-colors hover:border-[#14F195]/20 hover:bg-white/[0.05]">
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
      <div className="absolute inset-10 rounded-full bg-[#14F195]/10 blur-3xl" />
      <div className="absolute inset-x-4 top-8 bottom-12 rounded-full bg-[#7c4dff]/[0.12] blur-[58px]" />
      <div
        className="relative size-full"
        style={{ transform: `translateY(${-Math.min(offset * 0.012, 18)}px)` }}
      >
      <Hero3D
        pieceKey={pieceKey}
        png={png}
        alt={alt}
        pieceHeight={pieceKey.endsWith("Q") ? 2.3 : 2.55}
        className="size-full drop-shadow-[0_24px_70px_rgba(20,241,149,0.16)]"
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
    <div className={`rounded-lg border p-5 transition-colors ${highlight ? "border-[#14F195]/45 bg-[#14F195]/10" : "border-white/5 bg-white/[0.025] hover:border-[#14F195]/25 hover:bg-white/[0.05]"}`}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className={`text-xl font-bold ${highlight ? "text-[#14F195]" : "text-white"}`}>{rank}</span>
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
      className="group rounded-lg border border-white/5 bg-white/[0.025] p-6 transition-colors hover:border-[#14F195]/30 hover:bg-white/[0.05]"
    >
      {icon}
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#A6ABB4]">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#14F195] transition-all group-hover:gap-2">
        {action}
        <ChevronRight className="size-3" />
      </span>
    </Link>
  );
}

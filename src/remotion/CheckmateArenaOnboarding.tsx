import { type CSSProperties, type ReactNode } from "react";
import { Coins, Crown, Lock, Shield, Swords, Trophy, Zap } from "lucide-react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BRAND = "#E6B84F";
const PURPLE = "#B8860B";
const YELLOW = "#ffcf6b";
const BLACK = "#050505";
const MUTED = "#8A8F98";
const BODY = "#A6ABB4";
const BORDER = "rgba(255, 255, 255, 0.06)";
const PANEL = "rgba(255, 255, 255, 0.025)";
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IO = Easing.bezier(0.45, 0, 0.55, 1);

const rewardRows = [
  { rank: "1st", split: "25%", detail: "Top player" },
  { rank: "2nd", split: "18%", detail: "Runner up" },
  { rank: "3rd", split: "14%", detail: "Bronze" },
  { rank: "4th", split: "10%", detail: "Still paid" },
  { rank: "5th", split: "8%", detail: "Top half" },
  { rank: "6th", split: "7%", detail: "Consistent" },
  { rank: "7th", split: "6%", detail: "Grinding" },
  { rank: "8-10", split: "4-3%", detail: "Top 10" },
];

const beatLabels = ["Arena", "Rewards", "Wagers", "Join"];

export function CheckmateArenaOnboarding() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={styles.stage}>
      <Atmosphere frame={frame} />
      <CinematicNoise frame={frame} />
      <BrandHeader />
      <ProgressRail frame={frame} />
      <PieceImageScene frame={frame} />

      <Scene from={0} duration={6.2 * fps}>
        <OpeningBeat start={0} frame={frame} />
      </Scene>
      <Scene from={5.4 * fps} duration={7 * fps}>
        <RewardsBeat start={5.4 * fps} frame={frame} />
      </Scene>
      <Scene from={11.6 * fps} duration={7.1 * fps}>
        <WagerBeat start={11.6 * fps} frame={frame} />
      </Scene>
      <Scene from={18.2 * fps} duration={5.8 * fps}>
        <FinalBeat start={18.2 * fps} frame={frame} />
      </Scene>
    </AbsoluteFill>
  );
}

function Scene({
  from,
  duration,
  children,
}: {
  from: number;
  duration: number;
  children: ReactNode;
}) {
  return (
    <Sequence from={Math.round(from)} durationInFrames={Math.round(duration)}>
      {children}
    </Sequence>
  );
}

function OpeningBeat({ start, frame }: BeatProps) {
  const enter = entrance(frame, start, 34);
  const leave = leaveFade(frame, start + 152, 34);

  return (
    <AbsoluteFill
      style={{
        ...styles.content,
        opacity: enter * leave,
        transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px)`,
      }}
    >
      <div style={styles.copyColumn}>
        <Eyebrow>Ranked chess on Solana</Eyebrow>
        <h1 style={styles.heroTitle}>
          Enter the
          <span style={styles.accentLine}>King of Games</span>
        </h1>
        <p style={styles.heroCopy}>
          Hold 10,000 $CHESS to enter ranked matchmaking, chase the daily leaderboard,
          or opt into escrow-backed $CHESS wagers.
        </p>
        <div style={styles.buttonRow}>
          <Pill tone="primary" icon={<Swords size={24} />}>
            Play Ranked
          </Pill>
          <Pill icon={<Trophy size={24} />}>View Leaderboard</Pill>
        </div>
        <div style={styles.statusPill}>
          <span style={styles.statusDot} />
          <span style={styles.statusStrong}>10K $CHESS</span>
          <span>required for ranked</span>
          <span style={styles.statusDivider}>·</span>
          <span style={styles.statusStrong}>24h</span>
          <span>reward cycle</span>
        </div>
        <p style={styles.powered}>Powered by Solana</p>
      </div>
    </AbsoluteFill>
  );
}

function RewardsBeat({ start, frame }: BeatProps) {
  const local = frame - start;
  const enter = entrance(frame, start, 30);
  const leave = leaveFade(frame, start + 174, 34);
  const gridProgress = interpolate(local, [18, 82], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        ...styles.content,
        justifyContent: "center",
        opacity: enter * leave,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
      }}
    >
      <div style={styles.centerColumn}>
        <Eyebrow>Daily creator pool</Eyebrow>
        <h2 style={styles.sceneTitle}>Top 10 gets paid.</h2>
        <p style={styles.sceneCopy}>
          50% of daily creator fees distribute to ranked leaders every 24 hours.
        </p>
        <div style={styles.rewardGrid}>
          {rewardRows.map((reward, index) => {
            const reveal = interpolate(
              gridProgress,
              [index * 0.075, index * 0.075 + 0.25],
              [0, 1],
              {
                easing: EASE_OUT,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            return (
              <div
                key={reward.rank}
                style={{
                  ...styles.rewardCard,
                  ...(index === 0 ? styles.rewardCardHot : null),
                  opacity: reveal,
                  transform: `translateY(${interpolate(reveal, [0, 1], [22, 0])}px)`,
                }}
              >
                <div style={styles.rewardTopline}>
                  <span style={index === 0 ? styles.rewardRankHot : styles.rewardRank}>
                    {reward.rank}
                  </span>
                  <strong style={styles.rewardSplit}>{reward.split}</strong>
                </div>
                <p style={styles.rewardDetail}>{reward.detail}</p>
              </div>
            );
          })}
        </div>
        <PoolBar progress={gridProgress} />
      </div>
    </AbsoluteFill>
  );
}

function WagerBeat({ start, frame }: BeatProps) {
  const local = frame - start;
  const enter = entrance(frame, start, 30);
  const leave = leaveFade(frame, start + 176, 34);
  const publicReveal = interpolate(local, [16, 48], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const privateReveal = interpolate(local, [34, 66], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        ...styles.content,
        justifyContent: "center",
        opacity: enter * leave,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
      }}
    >
      <div style={styles.centerNarrow}>
        <Eyebrow>Opt-in $CHESS</Eyebrow>
        <h2 style={styles.sceneTitle}>Play for keeps.</h2>
        <p style={styles.sceneCopy}>
          Ranked unlocks at 10,000 $CHESS. Public challenges and private rooms settle
          on-chain in $CHESS.
        </p>
        <div style={styles.modeGrid}>
          <ModeCard
            icon={<Coins size={36} />}
            title="Public lobby"
            body="Browse open challenges. Snap-to-tier stakes from 100 up to 100,000 $CHESS."
            action="Open lobby"
            progress={publicReveal}
          />
          <ModeCard
            icon={<Lock size={36} />}
            title="Private room"
            body="Create a single-use 6-character room code for friends, streams, and brackets."
            action="Create room"
            progress={privateReveal}
          />
        </div>
        <p style={styles.feeNote}>
          Winner takes the pot minus a 2% house fee. Players pay their own network gas.
        </p>
      </div>
    </AbsoluteFill>
  );
}

function FinalBeat({ start, frame }: BeatProps) {
  const enter = entrance(frame, start, 36);
  const pulse = interpolate(Math.sin((frame - start) / 18), [-1, 1], [0.72, 1]);

  return (
    <AbsoluteFill
      style={{
        ...styles.content,
        justifyContent: "center",
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.98, 1])})`,
      }}
    >
      <div style={styles.finalPanel}>
        <div
          style={{
            ...styles.finalIcon,
            boxShadow: `0 0 ${64 + pulse * 34}px rgba(230, 184, 79, 0.3)`,
          }}
        >
          <Crown size={52} />
        </div>
        <h2 style={styles.finalTitle}>Checkmate Arena</h2>
        <p style={styles.finalCopy}>
          Hold 10K $CHESS for ranked matchmaking. Daily top-10 rewards.
          Escrow-backed wager lobbies.
        </p>
        <div style={styles.buttonRowCenter}>
          <Pill tone="primary" icon={<Zap size={24} />}>
            Join the Arena
          </Pill>
          <Pill icon={<Shield size={24} />}>Server validated</Pill>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function PieceImageScene({ frame }: { frame: number }) {
  const hero = windowed(frame, 0, 172);
  const rewards = windowed(frame, 148, 370);
  const wagers = windowed(frame, 335, 565);
  const close = windowed(frame, 536, 720);
  const drift = Math.sin(frame / 42) * 13;
  const slowScale = 1 + Math.sin(frame / 86) * 0.014;

  return (
    <AbsoluteFill style={styles.pieceImageLayer}>
      <div
        style={{
          ...styles.pieceGlow,
          opacity: hero * 0.9,
          right: 160,
          top: 122 + drift,
          transform: `scale(${slowScale})`,
        }}
      />
      <Img
        src={staticFile("king-piece-png.png")}
        style={{
          ...styles.heroPieceImage,
          opacity: hero * 0.86,
          transform: `translateY(${drift}px) scale(${slowScale})`,
        }}
      />

      <Img
        src={staticFile("king-piece-png.png")}
        style={{
          ...styles.rewardPieceLeft,
          opacity: rewards * 0.16,
          transform: `translateY(${-drift * 0.35}px) rotate(-8deg) scale(${1 + rewards * 0.04})`,
        }}
      />
      <Img
        src={staticFile("king-piece-png.png")}
        style={{
          ...styles.rewardPieceRight,
          opacity: rewards * 0.2,
          transform: `translateY(${drift * 0.4}px) rotate(8deg) scale(${1 + rewards * 0.05})`,
        }}
      />

      <Img
        src={staticFile("king-piece-png.png")}
        style={{
          ...styles.wagerPieceImage,
          opacity: wagers * 0.42,
          transform: `translateY(${drift * 0.7}px) scale(${1 + wagers * 0.035})`,
        }}
      />

      <div
        style={{
          ...styles.finalPieceHalo,
          opacity: close * 0.9,
          transform: `translateX(-50%) scale(${0.98 + close * 0.04})`,
        }}
      />
      <Img
        src={staticFile("king-piece-png.png")}
        style={{
          ...styles.finalPieceImage,
          opacity: close * 0.13,
          transform: `translateX(-50%) translateY(${drift * 0.25}px) scale(${0.98 + close * 0.03})`,
        }}
      />
    </AbsoluteFill>
  );
}

function ModeCard({
  icon,
  title,
  body,
  action,
  progress,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: string;
  progress: number;
}) {
  return (
    <div
      style={{
        ...styles.modeCard,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [28, 0])}px)`,
      }}
    >
      <div style={styles.modeIcon}>{icon}</div>
      <h3 style={styles.modeTitle}>{title}</h3>
      <p style={styles.modeBody}>{body}</p>
      <span style={styles.modeAction}>{action}</span>
    </div>
  );
}

function PoolBar({ progress }: { progress: number }) {
  return (
    <div style={styles.poolWrap}>
      <div style={styles.poolBar}>
        <span style={{ ...styles.poolSegment, width: `${25 * progress}%`, background: BRAND }} />
        <span style={{ ...styles.poolSegment, width: `${18 * progress}%`, background: "#C9A227" }} />
        <span style={{ ...styles.poolSegment, width: `${14 * progress}%`, background: "#27aee4" }} />
        <span style={{ ...styles.poolSegment, width: `${10 * progress}%`, background: PURPLE }} />
        <span style={{ ...styles.poolSegment, width: `${33 * progress}%`, background: "#9ca3af" }} />
      </div>
      <div style={styles.poolLabels}>
        <span>1st: 25%</span>
        <span>Total Pool: 100%</span>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div style={styles.brandHeader}>
      <Img src={staticFile("king-piece-png.png")} style={styles.brandIcon} />
      <span>Checkmate Arena</span>
    </div>
  );
}

function ProgressRail({ frame }: { frame: number }) {
  const progress = interpolate(frame, [0, 719], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const active = Math.min(beatLabels.length - 1, Math.floor(progress * beatLabels.length));

  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>
      <div style={styles.beatLabels}>
        {beatLabels.map((label, index) => (
          <span key={label} style={index === active ? styles.beatLabelActive : styles.beatLabel}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Atmosphere({ frame }: { frame: number }) {
  const bloomX = 50 + Math.sin(frame / 112) * 1.4;
  const bloomY = -6 + Math.cos(frame / 126) * 1.2;
  const bronzeX = 85 + Math.cos(frame / 118) * 1.6;
  const bronzeY = 22 + Math.sin(frame / 104) * 1.2;

  return (
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(56% 40% at ${bloomX}% ${bloomY}%, rgba(232, 191, 96, 0.15) 0%, rgba(232, 191, 96, 0.045) 34%, transparent 60%),` +
          `radial-gradient(44% 38% at ${bronzeX}% ${bronzeY}%, rgba(176, 132, 38, 0.09) 0%, transparent 55%),` +
          "radial-gradient(125% 95% at 50% 2%, transparent 52%, rgba(0, 0, 0, 0.55) 100%)," +
          "linear-gradient(180deg, #070604 0%, #050505 46%, #040404 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(36% 28% at ${bloomX}% 8%, rgba(235, 198, 104, 0.13) 0%, transparent 62%)`,
          mixBlendMode: "screen",
          opacity: interpolate(Math.sin(frame / 90), [-1, 1], [0.8, 1]),
        }}
      />
    </AbsoluteFill>
  );
}

function CinematicNoise({ frame }: { frame: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          "repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px 3px)",
        backgroundPosition: `0 ${frame * 0.04}px`,
        mixBlendMode: "overlay",
        opacity: 0.5,
      }}
    />
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p style={styles.eyebrow}>{children}</p>;
}

function Pill({
  icon,
  tone,
  children,
}: {
  icon: ReactNode;
  tone?: "primary";
  children: ReactNode;
}) {
  return (
    <div style={tone === "primary" ? styles.pillPrimary : styles.pill}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

function entrance(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function leaveFade(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [1, 0], {
    easing: EASE_IO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function windowed(frame: number, start: number, end: number) {
  return interpolate(frame, [start, start + 26, end - 26, end], [0, 1, 1, 0], {
    easing: EASE_IO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function findMesh(scene: THREE.Object3D, nodeName: string): THREE.Mesh {
  const target = normalizeName(nodeName);
  let found: THREE.Mesh | undefined;
  scene.traverse((object) => {
    if (!found && (object as THREE.Mesh).isMesh && normalizeName(object.name) === target) {
      found = object as THREE.Mesh;
    }
  });
  if (!found) throw new Error(`Mesh not found in chess set: ${nodeName}`);
  return found;
}

function bakedGeometry(scene: THREE.Object3D, nodeName: string): THREE.BufferGeometry {
  const mesh = findMesh(scene, nodeName);
  mesh.updateWorldMatrix(true, false);
  const geo = (mesh.geometry as THREE.BufferGeometry).clone();
  geo.applyMatrix4(mesh.matrixWorld);
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return geo;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  geo.translate(-cx, -box.min.y, -cz);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  return geo;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type BeatProps = {
  start: number;
  frame: number;
};

const baseText: CSSProperties = {
  letterSpacing: 0,
  margin: 0,
};

const styles: Record<string, CSSProperties> = {
  stage: {
    backgroundColor: BLACK,
    color: "white",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    display: "flex",
    justifyContent: "flex-start",
    padding: "112px 132px",
    zIndex: 5,
  },
  copyColumn: {
    maxWidth: 780,
  },
  centerColumn: {
    margin: "0 auto",
    maxWidth: 1060,
    textAlign: "center",
  },
  centerNarrow: {
    margin: "0 auto",
    maxWidth: 980,
    textAlign: "center",
  },
  eyebrow: {
    ...baseText,
    color: MUTED,
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "0.28em",
    marginBottom: 18,
    textTransform: "uppercase",
  },
  heroTitle: {
    ...baseText,
    fontSize: 108,
    fontWeight: 700,
    lineHeight: 0.96,
    maxWidth: 740,
  },
  accentLine: {
    color: BRAND,
    display: "block",
  },
  heroCopy: {
    ...baseText,
    color: BODY,
    fontSize: 30,
    lineHeight: 1.45,
    marginTop: 34,
    maxWidth: 760,
  },
  sceneTitle: {
    ...baseText,
    fontSize: 78,
    fontWeight: 700,
    lineHeight: 1.03,
  },
  sceneCopy: {
    ...baseText,
    color: BODY,
    fontSize: 28,
    lineHeight: 1.45,
    margin: "22px auto 0",
    maxWidth: 820,
  },
  buttonRow: {
    display: "flex",
    gap: 18,
    marginTop: 42,
  },
  buttonRowCenter: {
    display: "flex",
    gap: 18,
    justifyContent: "center",
    marginTop: 42,
  },
  pillPrimary: {
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: 999,
    color: "#000",
    display: "flex",
    fontSize: 24,
    fontWeight: 700,
    gap: 12,
    height: 64,
    padding: "0 32px",
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 999,
    color: BODY,
    display: "inline-flex",
    fontSize: 18,
    gap: 12,
    lineHeight: 1,
    marginTop: 28,
    padding: "14px 20px",
  },
  statusDot: {
    backgroundColor: BRAND,
    borderRadius: 999,
    boxShadow: "0 0 22px rgba(230, 184, 79, 0.7)",
    display: "inline-block",
    height: 10,
    width: 10,
  },
  statusStrong: {
    color: "#fff",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontWeight: 700,
  },
  statusDivider: {
    color: "rgba(255, 255, 255, 0.16)",
  },
  pill: {
    alignItems: "center",
    backgroundColor: PANEL,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    color: "#fff",
    display: "flex",
    fontSize: 24,
    fontWeight: 600,
    gap: 12,
    height: 64,
    padding: "0 32px",
  },
  powered: {
    ...baseText,
    color: "#666C76",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "0.26em",
    marginTop: 48,
    textTransform: "uppercase",
  },
  rewardGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(4, 1fr)",
    marginTop: 54,
  },
  rewardCard: {
    backgroundColor: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: 24,
    textAlign: "left",
  },
  rewardCardHot: {
    backgroundColor: "rgba(230, 184, 79, 0.1)",
    border: "1px solid rgba(230, 184, 79, 0.45)",
  },
  rewardTopline: {
    alignItems: "baseline",
    display: "flex",
    justifyContent: "space-between",
  },
  rewardRank: {
    color: "#fff",
    fontSize: 29,
    fontWeight: 700,
  },
  rewardRankHot: {
    color: BRAND,
    fontSize: 29,
    fontWeight: 700,
  },
  rewardSplit: {
    color: "#fff",
    fontSize: 42,
  },
  rewardDetail: {
    ...baseText,
    color: BODY,
    fontSize: 18,
    lineHeight: 1.45,
    marginTop: 8,
  },
  poolWrap: {
    marginTop: 44,
  },
  poolBar: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 999,
    display: "flex",
    height: 18,
    overflow: "hidden",
  },
  poolSegment: {
    display: "block",
    height: "100%",
  },
  poolLabels: {
    color: MUTED,
    display: "flex",
    fontSize: 18,
    justifyContent: "space-between",
    marginTop: 12,
  },
  modeGrid: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "repeat(2, 1fr)",
    marginTop: 54,
  },
  modeCard: {
    backgroundColor: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    minHeight: 320,
    padding: 42,
    textAlign: "left",
  },
  modeIcon: {
    color: BRAND,
  },
  modeTitle: {
    ...baseText,
    fontSize: 34,
    fontWeight: 700,
    marginTop: 28,
  },
  modeBody: {
    ...baseText,
    color: BODY,
    fontSize: 23,
    lineHeight: 1.5,
    marginTop: 16,
  },
  modeAction: {
    color: BRAND,
    display: "inline-block",
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: "0.06em",
    marginTop: 32,
    textTransform: "uppercase",
  },
  feeNote: {
    ...baseText,
    color: MUTED,
    fontSize: 21,
    lineHeight: 1.4,
    margin: "34px auto 0",
    maxWidth: 780,
  },
  finalPanel: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    margin: "0 auto",
    maxWidth: 980,
    textAlign: "center",
  },
  finalIcon: {
    alignItems: "center",
    backgroundColor: "rgba(230, 184, 79, 0.1)",
    border: "1px solid rgba(230, 184, 79, 0.35)",
    borderRadius: 999,
    color: BRAND,
    display: "flex",
    height: 118,
    justifyContent: "center",
    width: 118,
  },
  finalTitle: {
    ...baseText,
    fontSize: 94,
    fontWeight: 700,
    lineHeight: 1,
    marginTop: 34,
  },
  finalCopy: {
    ...baseText,
    color: BODY,
    fontSize: 29,
    lineHeight: 1.45,
    marginTop: 24,
    maxWidth: 860,
  },
  brandHeader: {
    alignItems: "center",
    color: "#fff",
    display: "flex",
    fontSize: 18,
    fontWeight: 700,
    gap: 12,
    left: 58,
    letterSpacing: "0.24em",
    position: "absolute",
    textTransform: "uppercase",
    top: 44,
    zIndex: 8,
  },
  brandIcon: {
    height: 34,
    objectFit: "contain",
    width: 34,
  },
  progressWrap: {
    bottom: 42,
    left: 58,
    position: "absolute",
    right: 58,
    zIndex: 8,
  },
  progressTrack: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 999,
    height: 3,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: BRAND,
    height: "100%",
  },
  beatLabels: {
    color: MUTED,
    display: "flex",
    fontSize: 13,
    fontWeight: 700,
    justifyContent: "space-between",
    letterSpacing: "0.18em",
    marginTop: 12,
    textTransform: "uppercase",
  },
  beatLabel: {
    color: MUTED,
  },
  beatLabelActive: {
    color: BRAND,
  },
  threeLayer: {
    zIndex: 3,
  },
  pieceImageLayer: {
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 3,
  },
  pieceGlow: {
    background:
      "radial-gradient(closest-side, rgba(230, 184, 79, 0.18), rgba(184, 134, 11, 0.1) 42%, transparent 72%)",
    borderRadius: 999,
    filter: "blur(16px)",
    height: 680,
    position: "absolute",
    width: 560,
  },
  heroPieceImage: {
    filter:
      "hue-rotate(-108deg) saturate(0.82) brightness(0.92) drop-shadow(0 34px 94px rgba(230, 184, 79, 0.32))",
    height: 820,
    objectFit: "contain",
    position: "absolute",
    right: 150,
    top: 96,
    width: 560,
  },
  rewardPieceLeft: {
    filter: "hue-rotate(-108deg) saturate(0.72) brightness(0.78) blur(0.2px)",
    height: 760,
    left: -20,
    objectFit: "contain",
    position: "absolute",
    top: 210,
    width: 430,
  },
  rewardPieceRight: {
    filter:
      "hue-rotate(-108deg) saturate(0.72) brightness(0.82) drop-shadow(0 28px 72px rgba(230, 184, 79, 0.16))",
    height: 820,
    objectFit: "contain",
    position: "absolute",
    right: -30,
    top: 160,
    width: 470,
  },
  wagerPieceImage: {
    filter:
      "hue-rotate(-108deg) saturate(0.78) brightness(0.84) drop-shadow(0 30px 80px rgba(230, 184, 79, 0.18))",
    height: 860,
    objectFit: "contain",
    position: "absolute",
    right: 34,
    top: 128,
    width: 500,
  },
  finalPieceHalo: {
    background:
      "radial-gradient(closest-side, rgba(230, 184, 79, 0.16), rgba(184, 134, 11, 0.08) 42%, transparent 76%)",
    borderRadius: 999,
    filter: "blur(20px)",
    height: 720,
    left: "50%",
    position: "absolute",
    top: 120,
    width: 600,
  },
  finalPieceImage: {
    filter: "hue-rotate(-108deg) saturate(0.7) brightness(0.72)",
    height: 860,
    left: "50%",
    objectFit: "contain",
    position: "absolute",
    top: 114,
    width: 520,
  },
};

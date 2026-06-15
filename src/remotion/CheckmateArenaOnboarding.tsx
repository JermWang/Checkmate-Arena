import { Suspense, useMemo, type CSSProperties, type ReactNode } from "react";
import { useLoader } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
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
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BRAND = "#14F195";
const PURPLE = "#7c4dff";
const YELLOW = "#ffcf6b";
const BLACK = "#050505";
const MUTED = "#8A8F98";
const BODY = "#A6ABB4";
const BORDER = "rgba(255, 255, 255, 0.06)";
const PANEL = "rgba(255, 255, 255, 0.025)";
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IO = Easing.bezier(0.45, 0, 0.55, 1);

const PIECE_NODE = {
  wP: "White Pawn_all Metarial_0",
  wR: "White Rook Left_all Metarial_0",
  wN: "White Horse Left_all Metarial_0",
  wB: "White Bishop Left_all Metarial_0",
  wQ: "White Queen_all Metarial_0",
  wK: "White King_all Metarial_0",
  bP: "Black Pawn_all Metarial_0",
  bR: "Black Rook Left_all Metarial_0",
  bN: "Black Horse Left_all Metarial_0",
  bB: "Black Bishop Left_all Metarial_0",
  bQ: "Black Queen_all Metarial_0",
  bK: "Black King_all Metarial_0",
} as const;

type PieceKey = keyof typeof PIECE_NODE;

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
      <ChessScene frame={frame} />

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
          <span style={styles.greenLine}>King of Games</span>
        </h1>
        <p style={styles.heroCopy}>
          Connect your wallet, enter ranked matchmaking, chase the daily leaderboard,
          or opt into escrow-backed $CHESS wagers.
        </p>
        <div style={styles.buttonRow}>
          <Pill tone="green" icon={<Swords size={24} />}>
            Play ranked
          </Pill>
          <Pill icon={<Trophy size={24} />}>View leaderboard</Pill>
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
          Public challenges and private rooms settle on-chain in $CHESS.
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
            boxShadow: `0 0 ${64 + pulse * 34}px rgba(20, 241, 149, 0.3)`,
          }}
        >
          <Crown size={52} />
        </div>
        <h2 style={styles.finalTitle}>Checkmate Arena</h2>
        <p style={styles.finalCopy}>
          Ranked matchmaking. Daily top-10 rewards. Escrow-backed wager lobbies.
        </p>
        <div style={styles.buttonRowCenter}>
          <Pill tone="green" icon={<Zap size={24} />}>
            Join the Arena
          </Pill>
          <Pill icon={<Shield size={24} />}>Server validated</Pill>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ChessScene({ frame }: { frame: number }) {
  const { width, height } = useVideoConfig();
  const hero = windowed(frame, 0, 172);
  const rewards = windowed(frame, 148, 370);
  const wagers = windowed(frame, 335, 565);
  const close = windowed(frame, 536, 720);
  const drift = Math.sin(frame / 42) * 0.16;

  return (
    <AbsoluteFill style={styles.threeLayer}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 1.05, 7.2], fov: 32 }}
      >
        <Suspense fallback={null}>
          <ChessPieces
            frame={frame}
            drift={drift}
            hero={hero}
            rewards={rewards}
            wagers={wagers}
            close={close}
          />
        </Suspense>
      </ThreeCanvas>
    </AbsoluteFill>
  );
}

function ChessPieces({
  frame,
  drift,
  hero,
  rewards,
  wagers,
  close,
}: {
  frame: number;
  drift: number;
  hero: number;
  rewards: number;
  wagers: number;
  close: number;
}) {
  const gltf = useLoader(GLTFLoader, staticFile("chess_set.optimized.glb"));
  const scene = gltf.scene;
  const orbit = frame * 0.011;

  return (
    <>
      <ambientLight intensity={0.58} />
      <directionalLight position={[3, 6, 4]} intensity={4.8} castShadow />
      <directionalLight position={[-4, 2, 3]} intensity={1.35} color="#9fb8ff" />
      <directionalLight position={[0, 3, 5]} intensity={1.8} color="#ffffff" />
      <pointLight position={[-2, 3, -4]} intensity={48} distance={14} color={BRAND} />
      <pointLight position={[2.8, 1.5, -3]} intensity={28} distance={10} color={PURPLE} />
      <pointLight position={[3, 4, 3]} intensity={9} distance={12} color={YELLOW} />

      <group position={[2.35, -1.52 + drift, 0]} scale={1.18 * hero}>
        <Piece scene={scene} pieceKey="wN" height={3.15} rotationY={-Math.PI / 2 + orbit} />
      </group>

      <group position={[3.02, -1.42 + drift * 0.8, -0.1]} scale={1.02 * rewards}>
        <Piece scene={scene} pieceKey="wK" height={2.6} rotationY={orbit * 1.05} />
      </group>
      <group position={[-3.12, -1.58 - drift * 0.35, -0.18]} scale={0.9 * rewards}>
        <Piece scene={scene} pieceKey="wQ" height={2.38} rotationY={-orbit * 1.4} />
      </group>

      <group position={[3.08, -1.54 + drift, 0.05]} scale={1.08 * wagers}>
        <Piece scene={scene} pieceKey="bR" height={2.34} rotationY={orbit + Math.PI * 0.18} dark />
      </group>
      <group position={[1.88, -1.4 - drift * 0.65, 0.22]} scale={0.86 * wagers}>
        <Piece scene={scene} pieceKey="wP" height={1.88} rotationY={orbit * 1.25} />
      </group>

      <group position={[0, -1.5 + drift * 0.45, 0]} scale={1.1 * close}>
        <Piece scene={scene} pieceKey="wK" height={2.9} rotationY={orbit * 1.25} />
      </group>
    </>
  );
}

function Piece({
  scene,
  pieceKey,
  height,
  rotationY,
  dark = false,
}: {
  scene: THREE.Object3D;
  pieceKey: PieceKey;
  height: number;
  rotationY: number;
  dark?: boolean;
}) {
  const { geometry, material } = useMemo(() => {
    const geo = bakedGeometry(scene, PIECE_NODE[pieceKey]);
    geo.computeBoundingBox();
    const box = geo.boundingBox;
    const modelHeight = box ? box.max.y - box.min.y : 1;
    const scale = height / (modelHeight || 1);
    geo.scale(scale, scale, scale);
    geo.computeBoundingBox();

    const srcMesh = findMesh(scene, PIECE_NODE[pieceKey]);
    const mat = (
      Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material
    ).clone() as THREE.MeshStandardMaterial;
    mat.envMapIntensity = 1.1;
    mat.color = new THREE.Color(dark ? "#15151c" : "#EDE7DA");
    mat.metalness = dark ? 0.45 : 0.25;
    mat.roughness = dark ? 0.3 : 0.35;
    return { geometry: geo, material: mat };
  }, [dark, height, pieceKey, scene]);

  return <mesh geometry={geometry} material={material} rotation={[0, rotationY, 0]} castShadow />;
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
        <span style={{ ...styles.poolSegment, width: `${18 * progress}%`, background: "#10c77a" }} />
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
  const greenX = 54 + Math.sin(frame / 95) * 6;
  const purpleX = 18 + Math.cos(frame / 82) * 7;
  const purpleY = 34 + Math.sin(frame / 77) * 8;
  const purpleTwoY = 18 + Math.sin(frame / 88) * 8;

  return (
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(ellipse at ${greenX}% 8%, rgba(20, 241, 149, 0.24) 0%, rgba(20, 241, 149, 0.08) 23%, transparent 46%),` +
          `radial-gradient(ellipse at ${purpleX}% ${purpleY}%, rgba(124, 77, 255, 0.34) 0%, rgba(124, 77, 255, 0.12) 25%, transparent 55%),` +
          `radial-gradient(ellipse at 86% 48%, rgba(255, 207, 107, 0.08) 0%, transparent 36%),` +
          `radial-gradient(ellipse at 48% 84%, rgba(20, 241, 149, 0.11) 0%, transparent 42%),` +
          `radial-gradient(ellipse at 82% ${purpleTwoY}%, rgba(154, 112, 255, 0.26) 0%, rgba(154, 112, 255, 0.09) 28%, transparent 54%),` +
          "linear-gradient(180deg, #050505 0%, #070807 45%, #050505 100%)",
        filter: "saturate(1.28)",
      }}
    />
  );
}

function CinematicNoise({ frame }: { frame: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          "repeating-radial-gradient(circle at 17% 23%, rgba(255, 255, 255, 0.2) 0 0.5px, transparent 0.75px 2.5px)," +
          "repeating-radial-gradient(circle at 74% 61%, rgba(20, 241, 149, 0.12) 0 0.45px, transparent 0.7px 2.7px)," +
          "linear-gradient(90deg, rgba(0, 0, 0, 0.46), transparent 22%, transparent 74%, rgba(0, 0, 0, 0.4))," +
          "repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.016) 0 1px, transparent 1px 4px)",
        backgroundPosition: `${frame * 0.16}px ${frame * 0.08}px, ${-frame * 0.12}px ${frame * 0.18}px, 0 0, 0 ${frame * 0.04}px`,
        mixBlendMode: "overlay",
        opacity: 0.34,
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
  tone?: "green";
  children: ReactNode;
}) {
  return (
    <div style={tone === "green" ? styles.pillGreen : styles.pill}>
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
  greenLine: {
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
  pillGreen: {
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
    backgroundColor: "rgba(20, 241, 149, 0.1)",
    border: "1px solid rgba(20, 241, 149, 0.45)",
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
    backgroundColor: "rgba(20, 241, 149, 0.1)",
    border: "1px solid rgba(20, 241, 149, 0.35)",
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
};

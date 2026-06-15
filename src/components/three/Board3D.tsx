import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useChessSet, findMesh, PIECE_NODE, BOARD_NODE } from "./chessSet";

const BRAND = "#14F195";
const FILES = "abcdefgh";
const FIELD = 8; // playing field spans 8 world units → squareSize = 1
const SQ = FIELD / 8;
const BORDER_FRAC = 0.04; // fraction of the board bbox that is the outer frame
const PIECE_FUDGE = 1.0; // global multiplier if pieces look too big/small

type PieceKey = "P" | "R" | "N" | "B" | "Q" | "K";

interface Placed {
  square: string;
  type: PieceKey;
  white: boolean;
  x: number;
  z: number;
}

function parseFEN(fen: string): { type: PieceKey; white: boolean; file: number; rank: number }[] {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  const out: { type: PieceKey; white: boolean; file: number; rank: number }[] = [];
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        out.push({
          type: ch.toUpperCase() as PieceKey,
          white: ch === ch.toUpperCase(),
          file,
          rank,
        });
        file++;
      }
    }
  }
  return out;
}

function squareToXZ(file: number, rank: number): [number, number] {
  const x = (file - 3.5) * SQ;
  const z = (3.5 - (rank - 1)) * SQ;
  return [x, z];
}

/** Extract + scale + recenter the board and the 6 piece geometries once. */
function useBoardAssets() {
  const { scene } = useChessSet();
  return useMemo(() => {
    // Board geometry, baked to world.
    const boardMesh = findMesh(scene, BOARD_NODE);
    boardMesh.updateWorldMatrix(true, false);
    const boardGeo = (boardMesh.geometry as THREE.BufferGeometry).clone();
    boardGeo.applyMatrix4(boardMesh.matrixWorld);
    boardGeo.computeBoundingBox();
    const bb = boardGeo.boundingBox!;
    const spanX = bb.max.x - bb.min.x;
    const spanZ = bb.max.z - bb.min.z;
    const nativeSpan = Math.max(spanX, spanZ);
    const playing = nativeSpan * (1 - 2 * BORDER_FRAC);
    const S = FIELD / playing;

    // Scale board, recenter so center x/z at origin and TOP at y=0.
    boardGeo.scale(S, S, S);
    boardGeo.computeBoundingBox();
    const bb2 = boardGeo.boundingBox!;
    boardGeo.translate(
      -(bb2.min.x + bb2.max.x) / 2,
      -bb2.max.y,
      -(bb2.min.z + bb2.max.z) / 2
    );
    boardGeo.computeVertexNormals();

    // Piece geometries (use white meshes for both colors; tint per side).
    const pieces: Record<PieceKey, THREE.BufferGeometry> = {} as never;
    (["P", "R", "N", "B", "Q", "K"] as PieceKey[]).forEach((t) => {
      const m = findMesh(scene, PIECE_NODE["w" + t]);
      m.updateWorldMatrix(true, false);
      const g = (m.geometry as THREE.BufferGeometry).clone();
      g.applyMatrix4(m.matrixWorld);
      g.scale(S * PIECE_FUDGE, S * PIECE_FUDGE, S * PIECE_FUDGE);
      g.computeBoundingBox();
      const gb = g.boundingBox!;
      g.translate(
        -(gb.min.x + gb.max.x) / 2,
        -gb.min.y,
        -(gb.min.z + gb.max.z) / 2
      );
      g.computeVertexNormals();
      pieces[t] = g;
    });

    const boardMat = (
      Array.isArray(boardMesh.material) ? boardMesh.material[0] : boardMesh.material
    ).clone() as THREE.MeshStandardMaterial;

    return { boardGeo, pieces, boardMat };
  }, [scene]);
}

function Pieces({
  fen,
  assets,
}: {
  fen: string;
  assets: ReturnType<typeof useBoardAssets>;
}) {
  const whiteMat = useMemo(() => {
    const m = assets.boardMat.clone();
    m.color = new THREE.Color("#EDE7DA");
    m.metalness = 0.25;
    m.roughness = 0.4;
    return m;
  }, [assets]);
  const blackMat = useMemo(() => {
    const m = assets.boardMat.clone();
    m.color = new THREE.Color("#15151c");
    m.metalness = 0.45;
    m.roughness = 0.35;
    return m;
  }, [assets]);

  const placed: Placed[] = useMemo(() => {
    return parseFEN(fen).map((p) => {
      const [x, z] = squareToXZ(p.file, p.rank);
      return { square: FILES[p.file] + p.rank, type: p.type, white: p.white, x, z };
    });
  }, [fen]);

  return (
    <>
      {placed.map((p) => (
        <mesh
          key={p.square + p.type + (p.white ? "w" : "b")}
          geometry={assets.pieces[p.type]}
          material={p.white ? whiteMat : blackMat}
          position={[p.x, 0, p.z]}
          rotation={[0, p.white ? 0 : Math.PI, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

function ClickGrid({
  onSquare,
  selected,
  legal,
}: {
  onSquare?: (sq: string) => void;
  selected: string | null;
  legal: string[];
}) {
  const squares = useMemo(() => {
    const arr: { sq: string; x: number; z: number }[] = [];
    for (let f = 0; f < 8; f++)
      for (let r = 1; r <= 8; r++) {
        const [x, z] = squareToXZ(f, r);
        arr.push({ sq: FILES[f] + r, x, z });
      }
    return arr;
  }, []);

  return (
    <group>
      {squares.map(({ sq, x, z }) => {
        const isSel = selected === sq;
        const isLegal = legal.includes(sq);
        return (
          <group key={sq} position={[x, 0, z]}>
            {/* invisible clickable plane */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.001, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSquare?.(sq);
              }}
            >
              <planeGeometry args={[SQ, SQ]} />
              <meshBasicMaterial transparent opacity={isSel ? 0.28 : 0} color={BRAND} />
            </mesh>
            {isLegal && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[SQ * 0.16, 24]} />
                <meshBasicMaterial transparent opacity={0.5} color={BRAND} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Scene({
  fen,
  orientation,
  onSquare,
  selected,
  legal,
}: {
  fen: string;
  orientation: "white" | "black";
  onSquare?: (sq: string) => void;
  selected: string | null;
  legal: string[];
}) {
  const assets = useBoardAssets();
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} rotation={[0, orientation === "black" ? Math.PI : 0, 0]}>
      <mesh geometry={assets.boardGeo} material={assets.boardMat} receiveShadow />
      <Pieces fen={fen} assets={assets} />
      <ClickGrid onSquare={onSquare} selected={selected} legal={legal} />
    </group>
  );
}

export function Board3D({
  fen,
  orientation = "white",
  onSquareClick,
  selectedSquare = null,
  legalMoves = [],
}: {
  fen: string;
  orientation?: "white" | "black";
  onSquareClick?: (sq: string) => void;
  selectedSquare?: string | null;
  legalMoves?: string[];
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 9, 9.6], fov: 34 }}
    >
      <color attach="background" args={["#0a0a0f"]} />
      <Suspense fallback={null}>
        <Scene
          fen={fen}
          orientation={orientation}
          onSquare={onSquareClick}
          selected={selectedSquare}
          legal={legalMoves}
        />
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.5}
          scale={14}
          blur={2.5}
          far={6}
          color="#000000"
        />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[5, 10, 6]}
          intensity={2.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#9fb8ff" />
        <pointLight position={[0, 4, -7]} intensity={30} distance={22} color={BRAND} />
        <Environment preset="city" environmentIntensity={0.3} />
        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={16}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0.4, 0]}
        />
      </Suspense>
    </Canvas>
  );
}

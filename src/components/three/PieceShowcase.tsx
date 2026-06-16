import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useChessSet, bakedGeometry, findMesh, PIECE_NODE } from "./chessSet";

const BRAND = "#E6B84F";

function PieceMesh({ pieceKey, height = 2.4 }: { pieceKey: string; height?: number }) {
  const { scene } = useChessSet();

  const { geometry, material } = useMemo(() => {
    const geo = bakedGeometry(scene, PIECE_NODE[pieceKey]);
    geo.computeBoundingBox();
    const h = geo.boundingBox!.max.y - geo.boundingBox!.min.y;
    const s = height / (h || 1);
    geo.scale(s, s, s);
    geo.computeBoundingBox();

    const srcMesh = findMesh(scene, PIECE_NODE[pieceKey]);
    const mat = (
      Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material
    ).clone() as THREE.MeshStandardMaterial;
    mat.envMapIntensity = 1.1;
    if (pieceKey.startsWith("w")) {
      mat.color = new THREE.Color("#EDE7DA");
      mat.metalness = 0.25;
      mat.roughness = 0.35;
    } else {
      mat.color = new THREE.Color("#14120B");
      mat.metalness = 0.45;
      mat.roughness = 0.3;
    }
    return { geometry: geo, material: mat };
  }, [scene, pieceKey, height]);

  return <mesh geometry={geometry} material={material} castShadow />;
}

export function PieceShowcase({
  pieceKey,
  className,
  autoRotate = true,
  height = 2.8,
}: {
  pieceKey: string;
  className?: string;
  autoRotate?: boolean;
  height?: number;
}) {
  const initialRotationY = pieceKey.endsWith("N") ? -Math.PI / 2 : 0;
  const verticalCenter = -height / 2;

  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      camera={{ position: [0, 1.25, 6.8], fov: 31 }}
    >
      <Suspense fallback={null}>
        <group position={[0, verticalCenter, 0]} rotation={[0, initialRotationY, 0]}>
          <PieceMesh pieceKey={pieceKey} height={height} />
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.55}
            scale={6}
            blur={2.6}
            far={4}
            color="#000000"
          />
        </group>

        {/* Dramatic studio rig */}
        <ambientLight intensity={0.55} />
        {/* key */}
        <directionalLight
          position={[3, 6, 4]}
          intensity={4.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        {/* cool fill */}
        <directionalLight position={[-4, 2, 3]} intensity={1.2} color="#E3CB82" />
        <directionalLight position={[0, 3, 5]} intensity={1.7} color="#ffffff" />
        {/* brand-green rim from behind */}
        <pointLight position={[-2, 3, -4]} intensity={45} distance={14} color={BRAND} />
        <pointLight position={[2.5, 1.5, -3]} intensity={18} distance={10} color={BRAND} />

        <Environment preset="city" environmentIntensity={0.35} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.1}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.9}
        />
      </Suspense>
    </Canvas>
  );
}

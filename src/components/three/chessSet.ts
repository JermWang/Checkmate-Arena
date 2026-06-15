import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export const CHESS_SET_URL = "/chess_set.optimized.glb";

// Friendly mesh names inside the GLB (each piece is its own node). We match
// these against the loaded scene with a normalized comparison, so it doesn't
// matter that three's GLTFLoader rewrites spaces/dots in node names.
export const PIECE_NODE: Record<string, string> = {
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
};

export const BOARD_NODE = "Bord_all Metarial_0";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Find a mesh in the scene by name, tolerant of GLTFLoader name sanitization. */
export function findMesh(scene: THREE.Object3D, nodeName: string): THREE.Mesh {
  const target = norm(nodeName);
  let found: THREE.Mesh | undefined;
  scene.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh && norm(o.name) === target) {
      found = o as THREE.Mesh;
    }
  });
  if (!found) throw new Error(`Mesh not found in chess set: ${nodeName}`);
  return found;
}

/**
 * Clone one mesh's geometry with its full world transform baked in (preserving
 * the Sketchfab parent-chain orientation), then recenter so the base sits at
 * y=0 and it's centered on x/z.
 */
export function bakedGeometry(
  scene: THREE.Object3D,
  nodeName: string
): THREE.BufferGeometry {
  const mesh = findMesh(scene, nodeName);
  mesh.updateWorldMatrix(true, false);
  const geo = (mesh.geometry as THREE.BufferGeometry).clone();
  geo.applyMatrix4(mesh.matrixWorld);
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  geo.translate(-cx, -box.min.y, -cz);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  return geo;
}

export function useChessSet() {
  return useGLTF(CHESS_SET_URL);
}

useGLTF.preload(CHESS_SET_URL);

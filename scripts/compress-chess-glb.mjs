// One-time: decimate + weld + meshopt-compress the realistic chess set so it
// loads fast on the web and runs 32 live pieces smoothly.
//
//   node scripts/compress-chess-glb.mjs
//
// Input:  public/realistic_chess_set_3d_model.glb  (~48MB, 754k verts)
// Output: public/chess_set.optimized.glb           (target: a few MB)

import { NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { weld, dedup, simplify, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import { EXTMeshoptCompression } from "@gltf-transform/extensions";

const IN = "public/realistic_chess_set_3d_model.glb";
const OUT = "public/chess_set.optimized.glb";

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptEncoder,
  });

console.log("Reading", IN);
const doc = await io.read(IN);

const before = doc
  .getRoot()
  .listMeshes()
  .reduce(
    (n, m) =>
      n +
      m
        .listPrimitives()
        .reduce((a, p) => a + (p.getAttribute("POSITION")?.getCount() ?? 0), 0),
    0
  );
console.log("Vertices before:", before.toLocaleString());

await doc.transform(
  dedup(),
  weld(),
  // Aggressively decimate. Chess pieces are smooth solids of revolution, so
  // ~15% of triangles keeps the silhouette while slashing the vertex count.
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.15, error: 0.002 }),
  prune()
);

const after = doc
  .getRoot()
  .listMeshes()
  .reduce(
    (n, m) =>
      n +
      m
        .listPrimitives()
        .reduce((a, p) => a + (p.getAttribute("POSITION")?.getCount() ?? 0), 0),
    0
  );
console.log("Vertices after: ", after.toLocaleString());

// NOTE: deliberately NOT applying EXT_meshopt_compression. The decimated
// geometry is already small (~117k verts), and shipping a plain GLB avoids any
// runtime meshopt-decoder dependency / loader-version mismatch in drei.

console.log("Writing", OUT);
await io.write(OUT, doc);
console.log("Done.");

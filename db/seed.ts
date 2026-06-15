import { getDb } from "../server/queries/connection";

async function seed() {
  getDb();
  console.log("Seeding database...");

  // Add deterministic seed rows here once game bootstrap data is finalized.

  console.log("Done.");
  process.exit(0);
}

seed();

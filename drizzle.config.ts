import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
const isOfflineCommand = process.argv.some((arg) =>
  ["generate", "introspect"].includes(arg)
);

if (!connectionString && !isOfflineCommand) {
  throw new Error(
    "DATABASE_URL is required. Paste the Supabase Transaction pooler URI into .env before running db:migrate or db:push."
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});

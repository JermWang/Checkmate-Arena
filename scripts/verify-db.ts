import "dotenv/config";
import postgres from "postgres";

const tableNames = [
  "users",
  "chess_players",
  "token_snapshots",
  "matches",
  "match_moves",
  "leaderboard_entries",
  "epochs",
  "epoch_rewards",
  "admin_flags",
  "admin_actions",
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is empty. Paste the Supabase Transaction pooler URI into .env."
    );
  }

  const sql = postgres(databaseUrl, { prepare: false, max: 1 });
  try {
    const [connection] = await sql<{
      db: string;
      schema: string;
      version: string;
    }[]>`
      select
        current_database() as db,
        current_schema() as schema,
        version() as version
    `;

    const existingTables = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(${tableNames})
      order by table_name
    `;

    const found = new Set(existingTables.map((row) => row.table_name));
    const missing = tableNames.filter((tableName) => !found.has(tableName));

    console.log(
      JSON.stringify(
        {
          connected: true,
          database: connection.db,
          schema: connection.schema,
          postgres: connection.version.split(" ").slice(0, 2).join(" "),
          tables: {
            found: existingTables.map((row) => row.table_name),
            missing,
          },
        },
        null,
        2
      )
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

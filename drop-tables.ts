
import { createPool } from "mysql2/promise";

const pool = createPool({
  host: "ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com",
  port: 4000,
  user: "wp6eJqjCn7vwiMW.root",
  password: "0oSuD4XYoxV1fjrbUNcTnLffxGgncLvn",
  database: "19ec87d1-9c32-86bf-8000-0972ab1150b2",
  ssl: { rejectUnauthorized: true },
});

async function dropTables() {
  const tables = [
    "admin_actions", "admin_flags", "epoch_rewards", "epochs",
    "leaderboard_entries", "match_moves", "matches", 
    "token_snapshots", "chess_players", "users"
  ];
  for (const t of tables) {
    await pool.execute(`DROP TABLE IF EXISTS ${t}`);
    console.log("Dropped:", t);
  }
  await pool.end();
}

dropTables().catch(console.error);

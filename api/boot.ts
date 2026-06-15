import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { createNewEpoch } from "./queries/leaderboard";
import { getDb } from "./queries/connection";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// Game config
app.get("/api/config", (c) =>
  c.json({
    requiredTokenBalance: 100000,
    timeControlSeconds: 300,
    epochLengthHours: 24,
  })
);

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { createServer } = await import("http");
  const { serveStaticFiles } = await import("./lib/vite");
  const { setupSocketIO } = await import("./socket");

  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const httpServer = createServer(app.fetch as never);

  // Setup Socket.IO
  setupSocketIO(httpServer);

  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
} else {
  // Dev: setup Socket.IO on a separate port or use the Vite dev server
  import("http").then(({ createServer }) => {
    import("./socket").then(({ setupSocketIO }) => {
      const httpServer = createServer();
      setupSocketIO(httpServer);
      httpServer.listen(3001, () => {
        console.log("Socket.IO server on port 3001");
      });
    });
  });

  // Ensure an epoch exists
  (async () => {
    try {
      const { getCurrentEpoch } = await import("./queries/leaderboard");
      const epoch = await getCurrentEpoch();
      if (!epoch) {
        await createNewEpoch();
        console.log("Created initial epoch");
      }
    } catch {
      // DB might not be ready yet
    }
  })();
}

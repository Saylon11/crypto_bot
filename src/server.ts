import dotenv from "dotenv";
dotenv.config();

import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import autoload from '@fastify/autoload';
import { join } from 'path';
import path from 'path';
// import { QUICKNODE_WEBSOCKET_URL } from "./qnAPI"; // Commented out for later use

// Load environment variables (you can use dotenv in development)
const PORT = process.env.PORT || "3000";
const API_KEY = process.env.API_KEY || ""; // The expected API key for auth
const fastify = Fastify({ logger: true }); // Enable Pino logger

// console.log("QuickNode WebSocket URL:", QUICKNODE_WEBSOCKET_URL); // Commented out for later use

// Global middleware (hook) to enforce Bearer API key authentication
fastify.addHook(
  "onRequest",
  (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const authHeader = request.headers["authorization"];
    const expected = `Bearer ${API_KEY}`;
    if (!authHeader || authHeader !== expected) {
      // Unauthorized if header is missing or doesn't match
      fastify.log.warn("Unauthorized access attempt.");
      reply.code(401).send({ error: "Unauthorized" });
    } else {
      done();
    }
  },
);

// POST /start - start the trading bot with a given strategy
fastify.post<{
  Body: { strategy: string }; // Define expected body type for TypeScript
}>(
  "/start",
  async (
    request: FastifyRequest<{ Body: { strategy: string } }>,
    reply: FastifyReply,
  ) => {
    const { strategy } = request.body;
    if (!strategy) {
      return reply
        .code(400)
        .send({ error: "Missing strategy in request body" });
    }
    if (!["pumpfun", "longterm"].includes(strategy)) {
      return reply.code(400).send({ error: "Invalid strategy type" });
    }
    fastify.log.info(`Starting bot with strategy: ${strategy}`); // Log the event
    try {
      // Removed startBot logic
      return reply.send({ status: "started", strategy });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      fastify.log.error(`Failed to start bot: ${error.message}`);
      return reply
        .code(500)
        .send({ error: "Bot failed to start", details: error.message });
    }
  },
);

// POST /stop - stop the trading bot
fastify.post("/stop", async (request: FastifyRequest, reply: FastifyReply) => {
  fastify.log.info("Stopping bot");
  try {
    // Removed stopBot logic
    return reply.send({ status: "stopped" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    fastify.log.error(`Failed to stop bot: ${error.message}`);
    return reply
      .code(500)
      .send({ error: "Bot failed to stop", details: error.message });
  }
});

// GET /status - get current status of the bot
fastify.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
  // Removed getStatus logic
  const status = { running: false }; // Example placeholder status
  return reply.send(status);
});

// Register TelePostBot routes
// fastify.register(import('./telegram/PC3_PostBot')); // Temporarily disabled by design
fastify.register(import('./x/postMeme'));
// Manually register TelePostBot route to ensure it loads in production
fastify.register(import('./routes/telepostbot/sendMeme'));
// Auto-load all routes from the /routes directory
fastify.register(autoload, {
  dir: path.resolve(__dirname, 'routes'),
  options: { prefix: '/' }
});
// Start the Fastify server
const start = async () => {
  try {
    await fastify.listen({ port: parseInt(PORT, 10), host: "0.0.0.0" });
    fastify.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fastify_1 = __importDefault(require("fastify"));
// Import the trading bot control functions from mainBot.ts
const mainBot_1 = require("./mainBot");
// Load environment variables (you can use dotenv in development)
const PORT = process.env.PORT || "3000";
const API_KEY = process.env.API_KEY || ""; // The expected API key for auth
const fastify = (0, fastify_1.default)({ logger: true }); // Enable Pino logger [oai_citation_attribution:1‡fastify.io](https://fastify.io/docs/latest/Reference/Logging/#:~:text=Logging%20is%20disabled%20by%20default,is%20used%20for%20this%20purpose)
// Global middleware (hook) to enforce Bearer API key authentication
fastify.addHook("onRequest", (request, reply, done) => {
    const authHeader = request.headers["authorization"];
    const expected = `Bearer ${API_KEY}`;
    if (!authHeader || authHeader !== expected) {
        // Unauthorized if header is missing or doesn't match
        fastify.log.warn("Unauthorized access attempt.");
        reply.code(401).send({ error: "Unauthorized" });
    }
    else {
        done();
    }
});
// POST /start - start the trading bot with a given strategy
fastify.post("/start", async (request, reply) => {
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
        await (0, mainBot_1.startBot)(strategy); // Invoke the bot start logic
        return reply.send({ status: "started", strategy });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        fastify.log.error(`Failed to start bot: ${error.message}`);
        return reply
            .code(500)
            .send({ error: "Bot failed to start", details: error.message });
    }
});
// POST /stop - stop the trading bot
fastify.post("/stop", async (request, reply) => {
    fastify.log.info("Stopping bot");
    try {
        await (0, mainBot_1.stopBot)(); // Invoke the bot stop logic
        return reply.send({ status: "stopped" });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        fastify.log.error(`Failed to stop bot: ${error.message}`);
        return reply
            .code(500)
            .send({ error: "Bot failed to stop", details: error.message });
    }
});
// GET /status - get current status of the bot
fastify.get("/status", async (request, reply) => {
    // Retrieve status from the bot logic (e.g., running state, current strategy)
    const status = (0, mainBot_1.getStatus)();
    // Example status object: { running: boolean, strategy?: string, ... }
    return reply.send(status);
});
// Start the Fastify server
const start = async () => {
    try {
        await fastify.listen({ port: parseInt(PORT, 10), host: "0.0.0.0" });
        fastify.log.info(`Server listening on port ${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fastify_1 = __importDefault(require("fastify"));
const autoload_1 = __importDefault(require("@fastify/autoload"));
const path_1 = __importDefault(require("path"));
// import { QUICKNODE_WEBSOCKET_URL } from "./qnAPI"; // Commented out for later use
// Load environment variables (you can use dotenv in development)
const PORT = process.env.PORT || "3000";
const API_KEY = process.env.API_KEY || ""; // The expected API key for auth
const fastify = (0, fastify_1.default)({ logger: true }); // Enable Pino logger
// console.log("QuickNode WebSocket URL:", QUICKNODE_WEBSOCKET_URL); // Commented out for later use
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
        // Removed startBot logic
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
        // Removed stopBot logic
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
    // Removed getStatus logic
    const status = { running: false }; // Example placeholder status
    return reply.send(status);
});
// Register TelePostBot routes
// fastify.register(import('./telegram/PC3_PostBot')); // Temporarily disabled by design
fastify.register(Promise.resolve().then(() => __importStar(require('./x/postMeme'))));
// Auto-load all routes from the /routes directory
fastify.register(autoload_1.default, {
    dir: path_1.default.resolve(__dirname, 'routes'),
    options: { prefix: '/' }
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
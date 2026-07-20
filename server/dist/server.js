"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const PORT = Number(process.env.PORT) || 5000;
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        const httpServer = (0, http_1.createServer)(app_1.default);
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
                credentials: true,
            },
        });
        io.on("connection", (socket) => {
            socket.on("project:join", ({ projectId }) => {
                if (projectId)
                    socket.join(`project:${projectId}`);
            });
            socket.on("project:leave", ({ projectId }) => {
                if (projectId)
                    socket.leave(`project:${projectId}`);
            });
        });
        app_1.default.set("io", io);
        httpServer.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
void startServer();

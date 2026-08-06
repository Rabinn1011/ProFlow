import "./config/env";
import app from "./app";
import { connectDB } from "./config/db";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./socket";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
        credentials: true,
      },
    });

    registerSocketHandlers(io);

    app.set("io", io);

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

void startServer();

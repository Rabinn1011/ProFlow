import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();

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

    io.on("connection", (socket) => {
      socket.on("project:join", ({ projectId }: { projectId?: string }) => {
        if (projectId) socket.join(`project:${projectId}`);
      });
      socket.on("project:leave", ({ projectId }: { projectId?: string }) => {
        if (projectId) socket.leave(`project:${projectId}`);
      });
    });

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

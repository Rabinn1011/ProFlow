"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    if (process.env.SKIP_DB === "true") {
        return;
    }
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is not defined in environment variables.");
    }
    try {
        await mongoose_1.default.connect(mongoUri);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error while connecting to MongoDB";
        throw new Error(`Failed to connect to MongoDB. If you're using Atlas, confirm IP whitelist / DNS access. Original: ${message}`);
    }
};
exports.connectDB = connectDB;

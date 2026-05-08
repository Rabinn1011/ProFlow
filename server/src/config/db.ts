import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  if (process.env.SKIP_DB === "true") {
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  try {
    await mongoose.connect(mongoUri);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error while connecting to MongoDB";
    throw new Error(
      `Failed to connect to MongoDB. If you're using Atlas, confirm IP whitelist / DNS access. Original: ${message}`,
    );
  }
};

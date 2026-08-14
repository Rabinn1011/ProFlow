import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Secrets must exist before any controller reads them. They are read at call time,
// so setting them here is enough — no real .env is involved in tests.
process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS = "900";
process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS = "604800";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// Each test starts from an empty database so ordering never matters.
afterEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  for (const collection of collections ?? []) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

import dotenv from "dotenv";

// Side-effect module: loads .env into process.env at import time.
// Must be the first import in server.ts so that env vars are populated
// before any module that reads them is evaluated.
dotenv.config();

// One-off migration for Increment 8.
//
// `completedAt` did not exist before analytics, so tasks completed earlier have no
// completion date. This approximates it with `updatedAt`, which is the closest signal
// available — accurate for tasks whose last edit WAS the move to done, and too late for
// any that were edited afterwards. Completions recorded after this migration are exact.
//
//   node scripts/backfill-completed-at.mjs          # report only
//   node scripts/backfill-completed-at.mjs --apply  # write

import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");

  await mongoose.connect(uri);
  const tasks = mongoose.connection.collection("tasks");

  const filter = { status: "done", $or: [{ completedAt: null }, { completedAt: { $exists: false } }] };
  const pending = await tasks.countDocuments(filter);

  console.log(`done tasks missing completedAt: ${pending}`);

  if (!pending) {
    console.log("nothing to do");
  } else if (!apply) {
    console.log("dry run — re-run with --apply to write");
  } else {
    const result = await tasks.updateMany(filter, [{ $set: { completedAt: "$updatedAt" } }]);
    console.log(`updated: ${result.modifiedCount}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("backfill failed:", err.message);
  process.exit(1);
});

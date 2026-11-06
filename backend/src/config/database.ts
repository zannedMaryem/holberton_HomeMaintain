import mongoose from "mongoose";
import User from "../models/User";
import JobCategory from "../models/JobCategory";
import Problem from "../models/Problem";
import normalizeExistingJobData from "./jobDataMigration";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined");
    }

    // Indexes are created only after legacy jobs are migrated, so the new
    // required fields and unique partial index cannot break startup.
    await mongoose.connect(mongoURI, { autoIndex: false });
    await normalizeExistingJobData();
    await Promise.all([
      User.createIndexes(),
      JobCategory.createIndexes(),
      Problem.createIndexes(),
    ]);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;

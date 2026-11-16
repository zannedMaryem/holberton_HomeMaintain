import mongoose from "mongoose";
import User from "../models/User";
import Problem from "../models/Problem";
import Service from "../models/Service";
import TechnicianProfile from "../models/TechnicianProfile";
import JobApplication from "../models/JobApplication";
import seedServiceCatalog from "./serviceCatalogSeed";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoURI, { autoIndex: false });
    await seedServiceCatalog();
    await Promise.all([
      User.createIndexes(),
      Service.createIndexes(),
      TechnicianProfile.createIndexes(),
      JobApplication.createIndexes(),
      Problem.createIndexes(),
    ]);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;

import mongoose, { Document, Schema } from "mongoose";
import {
  TUNISIA_GOVERNORATES,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";

export type ProblemStatus = "open" | "assigned" | "completed" | "closed";

export interface IProblem extends Document {
  reporterId: mongoose.Types.ObjectId;
  title: string;
  location: TunisiaGovernorateId;
  categoryId: mongoose.Types.ObjectId;
  description: string;
  status: ProblemStatus;
  duplicateFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

const problemSchema = new Schema<IProblem>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User Id is required"],
    },
    title: {
      type: String,
      required: [true, "The job title is required"],
      trim: true,
      minlength: [8, "The length of the title must be more than 8 characters"],
      maxLength: [72, "The lenght of the title must be under 72 charachters"],
    },
    location: {
      type: String,
      required: [true, "Location of the job is required"],
      trim: true,
      enum: TUNISIA_GOVERNORATES.map((governorate) => governorate.id),
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "JobCategory",
      required: [true, "A valid job category is required"],
    },
    description: {
      type: String,
      required: [true, "A description of the job is required"],
      trim: true,
      minlength: [
        2,
        "The length of the location must be more than 2 characters",
      ],
      maxlength: [2000, "The description must not exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["open", "assigned", "completed", "closed"],
        message: "Invalid Job status",
      },
      default: "open",
      required: [true, "The status of the job is required"],
    },
    duplicateFingerprint: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

// Stable ordering supports page navigation and category/location filtering.
problemSchema.index({ status: 1, createdAt: -1, _id: -1 });
problemSchema.index({ status: 1, categoryId: 1, createdAt: -1, _id: -1 });
problemSchema.index({ status: 1, location: 1, createdAt: -1, _id: -1 });
// Only open listings are unique; homeowners may repost a job after closing it.
problemSchema.index(
  { reporterId: 1, duplicateFingerprint: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
    name: "unique_open_job_per_homeowner",
  },
);

const Problem = mongoose.model<IProblem>("Problem", problemSchema);

export default Problem;

import mongoose, { Document, Schema } from "mongoose";
import {
  TUNISIA_GOVERNORATES,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";

export type ProblemStatus = "open" | "assigned" | "completed" | "closed";
export type JobTimeSlot = "morning" | "afternoon";

export interface IJobRating {
  reviewerId: mongoose.Types.ObjectId;
  score: number;
  createdAt: Date;
}

export interface IProblem extends Document {
  reporterId: mongoose.Types.ObjectId;
  title: string;
  location: TunisiaGovernorateId;
  serviceId: mongoose.Types.ObjectId;
  assignedTechnicianProfileId?: mongoose.Types.ObjectId;
  scheduledDate?: string;
  scheduledSlot?: JobTimeSlot;
  homeownerRating?: IJobRating;
  technicianRating?: IJobRating;
  description: string;
  status: ProblemStatus;
  duplicateFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobRatingSchema = new Schema<IJobRating>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number",
      },
    },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

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
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "A valid service is required"],
    },
    assignedTechnicianProfileId: {
      type: Schema.Types.ObjectId,
      ref: "TechnicianProfile",
    },
    scheduledDate: {
      // Keep this as a local calendar date instead of shifting it through UTC.
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Scheduled date must use YYYY-MM-DD"],
    },
    scheduledSlot: {
      type: String,
      enum: ["morning", "afternoon"],
    },
    homeownerRating: { type: jobRatingSchema },
    technicianRating: { type: jobRatingSchema },
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

// Stable ordering supports page navigation and service/location filtering.
problemSchema.index({ status: 1, createdAt: -1, _id: -1 });
problemSchema.index({ status: 1, serviceId: 1, createdAt: -1, _id: -1 });
problemSchema.index({ status: 1, location: 1, createdAt: -1, _id: -1 });
// A technician can have at most one active job in each reserved time slot.
problemSchema.index(
  { assignedTechnicianProfileId: 1, scheduledDate: 1, scheduledSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "assigned",
      scheduledDate: { $type: "string" },
      scheduledSlot: { $type: "string" },
    },
    name: "unique_assigned_technician_time_slot",
  },
);
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

import mongoose, { Document, Schema, model } from "mongoose";

export type JobApplicationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export interface IJobApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  technicianProfileId: mongoose.Types.ObjectId;
  proposalMessage: string;
  status: JobApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    technicianProfileId: {
      type: Schema.Types.ObjectId,
      ref: "TechnicianProfile",
      required: true,
    },
    proposalMessage: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true, collection: "jobApplications" },
);

jobApplicationSchema.index(
  { jobId: 1, technicianProfileId: 1 },
  { unique: true },
);
jobApplicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });

const JobApplication = model<IJobApplication>(
  "JobApplication",
  jobApplicationSchema,
);

export default JobApplication;

import mongoose, { Document, Schema } from "mongoose";

export type ProblemStatus = "open" | "assigned" | "completed" | "closed";

export interface IProblem extends Document {
  reporterId: mongoose.Types.ObjectId;
  title: string;
  location: string;
  category: string;
  description: string;
  status: ProblemStatus;
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
      minlength: [
        2,
        "The length of the location must be more than 2 characters",
      ],
      maxlength: [200, "The location must not exeed 200 characters"],
    },
    category: {
      type: String,
      required: [true, "The catagory of the job is required"],
      trim: true,
      minlength: [
        2,
        "The length of the location must be more than 2 characters",
      ],
      maxlength: [100, "The category must be under 100 characters"],
    },
    description: {
      type: String,
      required: [true, "A description of the job is required"],
      trim: true,
      minlength: [2,"The length of the location must be more than 2 characters"],
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
  },
  { timestamps: true },
);

problemSchema.index({ status: 1, createdAt: -1 });

const Problem = mongoose.model<IProblem>("Problem", problemSchema);

export default Problem;

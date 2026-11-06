import { Document, Schema, model } from "mongoose";

export interface IJobCategory extends Document {
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobCategorySchema = new Schema<IJobCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true, collection: "jobCategories" },
);

jobCategorySchema.index({ slug: 1 }, { unique: true });

const JobCategory = model<IJobCategory>("JobCategory", jobCategorySchema);

export default JobCategory;

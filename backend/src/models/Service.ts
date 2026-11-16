import { Document, Schema, model } from "mongoose";

export interface IService extends Document {
  name: string;
  description: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
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

serviceSchema.index({ slug: 1 }, { unique: true });

const Service = model<IService>("Service", serviceSchema);

export default Service;

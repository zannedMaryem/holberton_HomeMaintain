import mongoose, { Document, Schema, model } from "mongoose";
import {
  TUNISIA_GOVERNORATES,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";

export interface IServiceOffering {
  serviceId: mongoose.Types.ObjectId;
  governorates: TunisiaGovernorateId[];
}

export interface ITechnicianProfile extends Document {
  userId: mongoose.Types.ObjectId;
  displayName: string;
  description: string;
  photoDataUrl?: string;
  active: boolean;
  offerings: IServiceOffering[];
  createdAt: Date;
  updatedAt: Date;
}

const offeringSchema = new Schema<IServiceOffering>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    governorates: {
      type: [String],
      enum: TUNISIA_GOVERNORATES.map(({ id }) => id),
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "Each service must be offered in at least one governorate",
      },
    },
  },
  { _id: false },
);

const technicianProfileSchema = new Schema<ITechnicianProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 2000,
    },
    photoDataUrl: {
      type: String,
      maxlength: 75_000,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    offerings: {
      type: [offeringSchema],
      required: true,
      validate: {
        validator: (value: IServiceOffering[]) => value.length > 0,
        message: "At least one service offering is required",
      },
    },
  },
  { timestamps: true, collection: "technicianProfiles" },
);

technicianProfileSchema.index({ active: 1 });
technicianProfileSchema.index({ "offerings.serviceId": 1, "offerings.governorates": 1 });

const TechnicianProfile = model<ITechnicianProfile>(
  "TechnicianProfile",
  technicianProfileSchema,
);

export default TechnicianProfile;

import mongoose, { Document, Schema } from "mongoose";
import {
  TUNISIA_GOVERNORATES,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";

export interface IRentalReservation {
  status?: "confirmed" | "cancelled";
  bookingId: string;
  renterId: mongoose.Types.ObjectId;
  dates: string[];
  dailyPriceMillimes: number;
  totalPriceMillimes: number;
  createdAt: Date;
  cancelledAt?: Date;
}

export interface IRentalEquipment extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  description: string;
  dailyPriceMillimes: number;
  location: TunisiaGovernorateId;
  active: boolean;
  reservations: IRentalReservation[];
  createdAt: Date;
  updatedAt: Date;
}

const rentalReservationSchema = new Schema<IRentalReservation>(
  {
    bookingId: { type: String, required: true },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      required: true,
    },
    renterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dates: {
      type: [String],
      required: true,
      validate: {
        validator: (dates: string[]) => dates.length > 0,
        message: "A reservation must include at least one date",
      },
    },
    dailyPriceMillimes: { type: Number, required: true, min: 1 },
    totalPriceMillimes: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, required: true },
    cancelledAt: { type: Date },
  },
  { _id: false },
);

const rentalEquipmentSchema = new Schema<IRentalEquipment>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    dailyPriceMillimes: {
      type: Number,
      required: true,
      min: 1,
      max: 100_000_000,
      validate: Number.isSafeInteger,
    },
    location: {
      type: String,
      required: true,
      enum: TUNISIA_GOVERNORATES.map(({ id }) => id),
    },
    active: { type: Boolean, default: true, required: true },
    reservations: { type: [rentalReservationSchema], default: [] },
  },
  { timestamps: true },
);

rentalEquipmentSchema.index({ active: 1, location: 1, category: 1, createdAt: -1 });
rentalEquipmentSchema.index({ ownerId: 1, active: 1 });

const RentalEquipment = mongoose.model<IRentalEquipment>(
  "RentalEquipment",
  rentalEquipmentSchema,
);

export default RentalEquipment;

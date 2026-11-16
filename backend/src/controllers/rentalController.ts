import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  isTunisiaGovernorateId,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";
import {
  bookRentalEquipment,
  cancelRentalBooking,
  createRentalEquipment,
  deactivateRentalEquipment,
  getMyRentalData,
  getRentalAvailability,
  listRentalEquipment,
  rescheduleRentalBooking,
  setRentalEquipmentActive,
  updateRentalEquipment,
  type RentalEquipmentInput,
} from "../services/rentalService";
import {
  isValidDailyPriceTnd,
  isValidRentalAvailabilityRange,
  isValidRentalDateSelection,
} from "../utils/rentalValidation";

type RentalIdParams = { rentalId: string; bookingId?: string };
type RentalBookingParams = { rentalId: string; bookingId: string };

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateEquipmentInput = (
  value: unknown,
  res: Response,
): RentalEquipmentInput | undefined => {
  const fields = ["name", "category", "description", "dailyPriceTnd", "location"];
  if (
    !isJsonObject(value) ||
    Object.keys(value).some((field) => !fields.includes(field)) ||
    fields.some((field) => !(field in value))
  ) {
    res.status(400).json({ message: "Equipment details are required" });
    return undefined;
  }

  const { name, category, description, dailyPriceTnd, location } = value;
  if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 100) {
    res.status(400).json({ message: "name must contain between 3 and 100 characters" });
    return undefined;
  }
  if (
    typeof category !== "string" ||
    category.trim().length < 2 ||
    category.trim().length > 50
  ) {
    res.status(400).json({ message: "category must contain between 2 and 50 characters" });
    return undefined;
  }
  if (
    typeof description !== "string" ||
    description.trim().length < 10 ||
    description.trim().length > 1000
  ) {
    res.status(400).json({
      message: "description must contain between 10 and 1000 characters",
    });
    return undefined;
  }
  if (!isValidDailyPriceTnd(dailyPriceTnd)) {
    res.status(400).json({
      message: "dailyPriceTnd must be greater than 0 and use at most three decimals",
    });
    return undefined;
  }
  if (!isTunisiaGovernorateId(location)) {
    res.status(400).json({ message: "A supported Tunisia governorate is required" });
    return undefined;
  }

  return {
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    dailyPriceTnd,
    location: location as TunisiaGovernorateId,
  };
};

export const listRentals = async (req: Request, res: Response): Promise<void> => {
  const { search, category, location } = req.query;
  if (
    (search !== undefined &&
      (typeof search !== "string" || search.trim().length > 100)) ||
    (category !== undefined &&
      (typeof category !== "string" || category.trim().length > 50))
  ) {
    res.status(400).json({ message: "Invalid rental search filters" });
    return;
  }
  if (location !== undefined && !isTunisiaGovernorateId(location)) {
    res.status(400).json({ message: "location must be a supported Tunisia governorate" });
    return;
  }

  try {
    const data = await listRentalEquipment({
      search: typeof search === "string" ? search.trim() : undefined,
      category: typeof category === "string" ? category.trim() : undefined,
      location: isTunisiaGovernorateId(location) ? location : undefined,
    });
    res.status(200).json({ data });
  } catch (error) {
    console.error("List rental equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const postRental = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  const input = validateEquipmentInput(req.body, res);
  if (!input) return;

  try {
    const data = await createRentalEquipment(req.user.id, input);
    res.status(201).json({ data });
  } catch (error) {
    console.error("Create rental equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const putRental = async (
  req: Request<RentalIdParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  const input = validateEquipmentInput(req.body, res);
  if (!input) return;

  try {
    const data = await updateRentalEquipment(
      req.params.rentalId,
      req.user.id,
      input,
    );
    res.status(200).json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Rental equipment not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error("Update rental equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const patchRentalActive = async (
  req: Request<RentalIdParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 1 ||
    typeof req.body.active !== "boolean"
  ) {
    res.status(400).json({ message: "active must be a boolean" });
    return;
  }

  try {
    const data = await setRentalEquipmentActive(
      req.params.rentalId,
      req.user.id,
      req.body.active,
    );
    res.status(200).json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Rental equipment not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error("Update rental availability error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteRental = async (
  req: Request<RentalIdParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    await deactivateRentalEquipment(req.params.rentalId, req.user.id);
    res.status(204).end();
  } catch (error) {
    if (error instanceof Error && error.message === "Rental equipment not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error("Delete rental equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRentalDates = async (
  req: Request<RentalIdParams>,
  res: Response,
): Promise<void> => {
  const { from, to, bookingId } = req.query;
  if (
    typeof from !== "string" ||
    typeof to !== "string" ||
    !isValidRentalAvailabilityRange(from, to) ||
    (bookingId !== undefined &&
      (typeof bookingId !== "string" ||
        !mongoose.isObjectIdOrHexString(bookingId)))
  ) {
    res.status(400).json({
      message: "from and to must be valid future dates within the availability window",
    });
    return;
  }

  try {
    const data = await getRentalAvailability(
      req.params.rentalId,
      from,
      to,
      req.user?.id,
      typeof bookingId === "string" ? bookingId : undefined,
    );
    res.status(200).json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Rental equipment not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "Rental booking not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error("Get rental availability error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const patchRentalBooking = async (
  req: Request<RentalBookingParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((field) => field !== "dates") ||
    !isValidRentalDateSelection(req.body.dates)
  ) {
    res.status(400).json({
      message: "dates must contain 1 to 14 unique available dates in the next 90 days",
    });
    return;
  }

  try {
    const data = await rescheduleRentalBooking(
      req.params.rentalId,
      req.params.bookingId,
      req.user.id,
      req.body.dates,
    );
    res.status(200).json({ data });
  } catch (error) {
    if (
      error instanceof Error &&
      ["Rental equipment not found", "Rental booking not found"].includes(
        error.message,
      )
    ) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      [
        "Equipment is no longer available for rescheduling",
        "Only future bookings can be rescheduled",
        "Rental booking cannot be rescheduled",
        "One or more selected dates are no longer available",
      ].includes(error.message)
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    console.error("Reschedule rental booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteRentalBooking = async (
  req: Request<RentalBookingParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const data = await cancelRentalBooking(
      req.params.rentalId,
      req.params.bookingId,
      req.user.id,
    );
    res.status(200).json({ data });
  } catch (error) {
    if (
      error instanceof Error &&
      ["Rental equipment not found", "Rental booking not found"].includes(
        error.message,
      )
    ) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      [
        "Only future bookings can be cancelled",
        "Rental booking cannot be cancelled",
      ].includes(error.message)
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    console.error("Cancel rental booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const postRentalBooking = async (
  req: Request<RentalIdParams>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((field) => field !== "dates") ||
    !isValidRentalDateSelection(req.body.dates)
  ) {
    res.status(400).json({
      message: "dates must contain 1 to 14 unique available dates in the next 90 days",
    });
    return;
  }

  try {
    const data = await bookRentalEquipment(
      req.params.rentalId,
      req.user.id,
      req.body.dates,
    );
    res.status(201).json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Rental equipment not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "You cannot rent your own equipment") {
      res.status(403).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "One or more selected dates are no longer available"
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    console.error("Book rental equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const listMyRentals = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const data = await getMyRentalData(req.user.id);
    res.status(200).json({ data });
  } catch (error) {
    console.error("List personal rentals error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const validateRentalId = (
  req: Request,
  res: Response,
  next: () => void,
  rentalId: string,
): void => {
  if (!mongoose.isObjectIdOrHexString(rentalId)) {
    res.status(400).json({ message: "Invalid equipment ID" });
    return;
  }
  next();
};

export const validateRentalBookingId = (
  req: Request,
  res: Response,
  next: () => void,
  bookingId: string,
): void => {
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    res.status(400).json({ message: "Invalid booking ID" });
    return;
  }
  next();
};

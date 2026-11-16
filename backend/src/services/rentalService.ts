import mongoose from "mongoose";
import RentalEquipment, {
  type IRentalEquipment,
} from "../models/RentalEquipment";
import User from "../models/User";
import type { TunisiaGovernorateId } from "../constants/tunisiaGovernorates";
import {
  addDaysToRentalDate,
  fromMillimes,
  getTunisiaToday,
  isActiveRentalBooking,
  isFutureRentalBooking,
  MAX_RENTAL_DAYS_AHEAD,
  toMillimes,
} from "../utils/rentalValidation";

export interface RentalEquipmentInput {
  name: string;
  category: string;
  description: string;
  dailyPriceTnd: number;
  location: TunisiaGovernorateId;
}

export interface RentalFilters {
  search?: string;
  category?: string;
  location?: TunisiaGovernorateId;
}

const serializeEquipment = (
  equipment: IRentalEquipment,
  ownerName: string,
) => {
  const today = getTunisiaToday();
  const lastSelectableDate = addDaysToRentalDate(today, MAX_RENTAL_DAYS_AHEAD);
  return {
    id: equipment._id.toString(),
    ownerId: equipment.ownerId.toString(),
    ownerName,
    name: equipment.name,
    category: equipment.category,
    description: equipment.description,
    dailyPriceTnd: fromMillimes(equipment.dailyPriceMillimes),
    location: equipment.location,
    active: equipment.active,
    unavailableDates: equipment.reservations
      .filter(({ status }) => isActiveRentalBooking(status))
      .flatMap(({ dates }) => dates)
      .filter((date) => date >= today && date <= lastSelectableDate),
    createdAt: equipment.createdAt,
    updatedAt: equipment.updatedAt,
  };
};

const getOwnerNames = async (ownerIds: string[]) => {
  const owners = await User.find({ _id: { $in: ownerIds } }).select(
    "firstName lastName",
  );
  return new Map(
    owners.map((owner) => [
      owner.id,
      `${owner.firstName} ${owner.lastName}`,
    ]),
  );
};

export const listRentalEquipment = async (filters: RentalFilters) => {
  const query: Record<string, unknown> = { active: true };
  if (filters.location) query.location = filters.location;
  if (filters.category) query.category = filters.category;
  if (filters.search) {
    const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { category: { $regex: escapedSearch, $options: "i" } },
      { description: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const equipment = await RentalEquipment.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);
  const ownerNames = await getOwnerNames([
    ...new Set(equipment.map((item) => item.ownerId.toString())),
  ]);
  return equipment.map((item) =>
    serializeEquipment(item, ownerNames.get(item.ownerId.toString()) ?? "Member"),
  );
};

export const createRentalEquipment = async (
  ownerId: string,
  input: RentalEquipmentInput,
) => {
  const equipment = await RentalEquipment.create({
    ownerId,
    name: input.name,
    category: input.category,
    description: input.description,
    dailyPriceMillimes: toMillimes(input.dailyPriceTnd),
    location: input.location,
  });
  const ownerNames = await getOwnerNames([ownerId]);
  return serializeEquipment(equipment, ownerNames.get(ownerId) ?? "Member");
};

export const updateRentalEquipment = async (
  equipmentId: string,
  ownerId: string,
  input: RentalEquipmentInput,
) => {
  const equipment = await RentalEquipment.findOneAndUpdate(
    { _id: equipmentId, ownerId, active: true },
    {
      $set: {
        name: input.name,
        category: input.category,
        description: input.description,
        dailyPriceMillimes: toMillimes(input.dailyPriceTnd),
        location: input.location,
      },
    },
    { new: true, runValidators: true },
  );
  if (!equipment) throw new Error("Rental equipment not found");

  const ownerNames = await getOwnerNames([ownerId]);
  return serializeEquipment(equipment, ownerNames.get(ownerId) ?? "Member");
};

export const deactivateRentalEquipment = async (
  equipmentId: string,
  ownerId: string,
) => {
  const updated = await RentalEquipment.findOneAndUpdate(
    { _id: equipmentId, ownerId },
    { $set: { active: false } },
    { new: true },
  );
  if (!updated) throw new Error("Rental equipment not found");
};

export const setRentalEquipmentActive = async (
  equipmentId: string,
  ownerId: string,
  active: boolean,
) => {
  const equipment = await RentalEquipment.findOneAndUpdate(
    { _id: equipmentId, ownerId },
    { $set: { active } },
    { new: true, runValidators: true },
  );
  if (!equipment) throw new Error("Rental equipment not found");

  const ownerNames = await getOwnerNames([ownerId]);
  return serializeEquipment(equipment, ownerNames.get(ownerId) ?? "Member");
};

export const getRentalAvailability = async (
  equipmentId: string,
  from: string,
  to: string,
  renterId?: string,
  excludeBookingId?: string,
) => {
  const equipment = await RentalEquipment.findOne({
    _id: equipmentId,
    active: true,
  }).select("reservations.bookingId reservations.renterId reservations.dates reservations.status");
  if (!equipment) throw new Error("Rental equipment not found");
  if (excludeBookingId) {
    const ownBooking = equipment.reservations.find(
      ({ bookingId, renterId: bookingRenterId, status }) =>
        bookingId === excludeBookingId &&
        bookingRenterId.toString() === renterId &&
        isActiveRentalBooking(status),
    );
    if (!ownBooking) throw new Error("Rental booking not found");
  }

  const unavailable = new Set(
    equipment.reservations
      .filter(
        ({ status, bookingId, renterId: bookingRenterId }) =>
          isActiveRentalBooking(status) &&
          !(
            excludeBookingId &&
            renterId &&
            bookingId === excludeBookingId &&
            bookingRenterId.toString() === renterId
          ),
      )
      .flatMap(({ dates }) => dates),
  );
  const availableDates: string[] = [];
  const unavailableDates: string[] = [];
  for (
    let date = from;
    date <= to;
    date = addDaysToRentalDate(date, 1)
  ) {
    (unavailable.has(date) ? unavailableDates : availableDates).push(date);
  }
  return { availableDates, unavailableDates };
};

export const bookRentalEquipment = async (
  equipmentId: string,
  renterId: string,
  dates: string[],
) => {
  const equipment = await RentalEquipment.findOne({
    _id: equipmentId,
    active: true,
  }).select("ownerId dailyPriceMillimes");
  if (!equipment) throw new Error("Rental equipment not found");
  if (equipment.ownerId.toString() === renterId) {
    throw new Error("You cannot rent your own equipment");
  }

  const dailyPriceMillimes = equipment.dailyPriceMillimes;
  const booking = {
    bookingId: new mongoose.Types.ObjectId().toString(),
    status: "confirmed" as const,
    renterId: new mongoose.Types.ObjectId(renterId),
    dates,
    dailyPriceMillimes,
    totalPriceMillimes: dailyPriceMillimes * dates.length,
    createdAt: new Date(),
  };

  // One conditional document update atomically checks and reserves every requested day.
  const updated = await RentalEquipment.findOneAndUpdate(
    {
      _id: equipmentId,
      active: true,
      ownerId: { $ne: renterId },
      reservations: {
        $not: {
          $elemMatch: {
            status: { $ne: "cancelled" },
            dates: { $in: dates },
          },
        },
      },
    },
    { $push: { reservations: booking } },
    { new: true },
  ).select("_id name location");

  if (!updated) {
    const stillActive = await RentalEquipment.exists({
      _id: equipmentId,
      active: true,
    });
    if (!stillActive) throw new Error("Rental equipment not found");
    throw new Error("One or more selected dates are no longer available");
  }

  return {
    id: booking.bookingId,
    equipment: {
      id: updated._id.toString(),
      name: updated.name,
      location: updated.location,
      active: true,
    },
    dates: booking.dates,
    dailyPriceTnd: fromMillimes(booking.dailyPriceMillimes),
    totalPriceTnd: fromMillimes(booking.totalPriceMillimes),
    status: booking.status,
    createdAt: booking.createdAt,
  };
};

export const rescheduleRentalBooking = async (
  equipmentId: string,
  bookingId: string,
  renterId: string,
  dates: string[],
) => {
  const equipment = await RentalEquipment.findById(equipmentId).select(
    "active reservations",
  );
  if (!equipment) throw new Error("Rental equipment not found");

  const reservation = equipment.reservations.find(
    ({ bookingId: existingId, renterId: existingRenter }) =>
      existingId === bookingId && existingRenter.toString() === renterId,
  );
  if (!reservation || !isActiveRentalBooking(reservation.status)) {
    throw new Error("Rental booking not found");
  }
  if (!equipment.active) {
    throw new Error("Equipment is no longer available for rescheduling");
  }
  if (!isFutureRentalBooking(reservation.dates)) {
    throw new Error("Only future bookings can be rescheduled");
  }

  const updated = await RentalEquipment.findOneAndUpdate(
    {
      _id: equipmentId,
      active: true,
      reservations: {
        $elemMatch: {
          bookingId,
          renterId: new mongoose.Types.ObjectId(renterId),
          status: { $ne: "cancelled" },
          dates: reservation.dates,
        },
      },
      $nor: [
        {
          reservations: {
            $elemMatch: {
              bookingId: { $ne: bookingId },
              status: { $ne: "cancelled" },
              dates: { $in: dates },
            },
          },
        },
      ],
    },
    {
      $set: {
        "reservations.$.dates": dates,
        "reservations.$.totalPriceMillimes":
          reservation.dailyPriceMillimes * dates.length,
      },
    },
    { new: true },
  ).select("_id name location active reservations");

  if (!updated) {
    const stillActive = await RentalEquipment.exists({
      _id: equipmentId,
      active: true,
      reservations: {
        $elemMatch: {
          bookingId,
          renterId: new mongoose.Types.ObjectId(renterId),
          status: { $ne: "cancelled" },
        },
      },
    });
    if (!stillActive) {
      const exists = await RentalEquipment.exists({ _id: equipmentId });
      if (!exists) throw new Error("Rental equipment not found");
      throw new Error("Rental booking cannot be rescheduled");
    }
    throw new Error("One or more selected dates are no longer available");
  }

  return serializeBooking(
    updated,
    updated.reservations.find((item) => item.bookingId === bookingId)!,
  );
};

export const cancelRentalBooking = async (
  equipmentId: string,
  bookingId: string,
  renterId: string,
) => {
  const equipment = await RentalEquipment.findById(equipmentId).select(
    "reservations",
  );
  if (!equipment) throw new Error("Rental equipment not found");
  const reservation = equipment.reservations.find(
    ({ bookingId: existingId, renterId: existingRenter }) =>
      existingId === bookingId && existingRenter.toString() === renterId,
  );
  if (!reservation || !isActiveRentalBooking(reservation.status)) {
    throw new Error("Rental booking not found");
  }
  if (!isFutureRentalBooking(reservation.dates)) {
    throw new Error("Only future bookings can be cancelled");
  }

  const updated = await RentalEquipment.findOneAndUpdate(
    {
      _id: equipmentId,
      reservations: {
        $elemMatch: {
          bookingId,
          renterId: new mongoose.Types.ObjectId(renterId),
          status: { $ne: "cancelled" },
          dates: reservation.dates,
        },
      },
    },
    {
      $set: {
        "reservations.$.status": "cancelled",
        "reservations.$.cancelledAt": new Date(),
      },
    },
    { new: true },
  ).select("_id name location active reservations");

  if (!updated) throw new Error("Rental booking cannot be cancelled");
  return serializeBooking(
    updated,
    updated.reservations.find((item) => item.bookingId === bookingId)!,
  );
};

const serializeBooking = (
  equipment: Pick<IRentalEquipment, "_id" | "name" | "location" | "active">,
  reservation: IRentalEquipment["reservations"][number],
) => ({
  id: reservation.bookingId,
  equipment: {
    id: equipment._id.toString(),
    name: equipment.name,
    location: equipment.location,
    active: equipment.active,
  },
  dates: reservation.dates,
  dailyPriceTnd: fromMillimes(reservation.dailyPriceMillimes),
  totalPriceTnd: fromMillimes(reservation.totalPriceMillimes),
  status: reservation.status ?? "confirmed",
  createdAt: reservation.createdAt,
  cancelledAt: reservation.cancelledAt,
});

export const getMyRentalData = async (userId: string) => {
  const equipment = await RentalEquipment.find({
    $or: [{ ownerId: userId }, { "reservations.renterId": userId }],
  }).sort({ updatedAt: -1, _id: -1 });
  const ownerNames = await getOwnerNames([
    ...new Set(equipment.map((item) => item.ownerId.toString())),
  ]);

  return {
    equipment: equipment
      .filter((item) => item.ownerId.toString() === userId)
      .map((item) =>
        serializeEquipment(item, ownerNames.get(item.ownerId.toString()) ?? "Member"),
      ),
    bookings: equipment.flatMap((item) =>
      item.reservations
        .filter(({ renterId }) => renterId.toString() === userId)
        .map((reservation) => ({
          id: reservation.bookingId,
          equipment: {
            id: item._id.toString(),
            name: item.name,
            location: item.location,
            active: item.active,
          },
          dates: reservation.dates,
          dailyPriceTnd: fromMillimes(reservation.dailyPriceMillimes),
          totalPriceTnd: fromMillimes(reservation.totalPriceMillimes),
          status: reservation.status ?? "confirmed",
          createdAt: reservation.createdAt,
          cancelledAt: reservation.cancelledAt,
        })),
    ),
  };
};

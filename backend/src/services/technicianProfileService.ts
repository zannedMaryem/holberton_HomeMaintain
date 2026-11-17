import mongoose from "mongoose";
import TechnicianProfile, {
  type ITechnicianProfile,
  type IServiceOffering,
} from "../models/TechnicianProfile";
import Service from "../models/Service";
import { validateActiveServiceIds } from "./serviceService";
import {
  getTechnicianRatingSummaries,
  getTechnicianRatingSummary,
} from "./ratingSummaryService";
import type { TunisiaGovernorateId } from "../constants/tunisiaGovernorates";

export interface TechnicianProfileInput {
  displayName: string;
  description: string;
  photoDataUrl?: string | null;
  active: boolean;
  offerings: Array<{
    serviceId: string;
    governorates: TunisiaGovernorateId[];
  }>;
}

const withOfferingServices = async (
  profile: ITechnicianProfile,
) => {
  const serviceIds = profile.offerings.map((offering) =>
    offering.serviceId.toString(),
  );
  const services = await Service.find({ _id: { $in: serviceIds } });
  const servicesById = new Map(services.map((service) => [service.id, service]));

  const ratings = await getTechnicianRatingSummary(profile.id);
  return {
    profile,
    ratings,
    offerings: profile.offerings.map((offering) => {
      const service = servicesById.get(offering.serviceId.toString());
      if (!service) {
        throw new Error("Technician profile references a missing service");
      }

      return {
        service: {
          id: service.id,
          name: service.name,
          active: service.active,
        },
        governorates: offering.governorates,
      };
    }),
  };
};

export const getTechnicianProfile = async (userId: string) => {
  const profile = await TechnicianProfile.findOne({ userId });
  if (!profile) {
    throw new Error("Technician profile not found");
  }

  return withOfferingServices(profile);
};

export const saveTechnicianProfile = async (
  userId: string,
  input: TechnicianProfileInput,
) => {
  const services = await validateActiveServiceIds(
    input.offerings.map(({ serviceId }) => serviceId),
  );
  const activeServiceIds = new Set(services.map((service) => service.id));
  const offerings: IServiceOffering[] = input.offerings.map((offering) => ({
    serviceId: new mongoose.Types.ObjectId(offering.serviceId),
    governorates: offering.governorates,
  }));
  if (
    offerings.some(
      (offering) => !activeServiceIds.has(offering.serviceId.toString()),
    )
  ) {
    throw new Error("Every selected service must exist and be active");
  }

  const profile = await TechnicianProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        displayName: input.displayName,
        description: input.description,
        active: input.active,
        offerings,
        ...(input.photoDataUrl
          ? { photoDataUrl: input.photoDataUrl }
          : {}),
      },
      ...(input.photoDataUrl === null ? { $unset: { photoDataUrl: "" } } : {}),
      $setOnInsert: { userId },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return withOfferingServices(profile);
};

export const deactivateTechnicianProfile = async (userId: string) => {
  const profile = await TechnicianProfile.findOneAndUpdate(
    { userId },
    { $set: { active: false } },
    { new: true, runValidators: true },
  );
  if (!profile) {
    throw new Error("Technician profile not found");
  }

  // Keep the profile and offerings so past jobs and ratings remain connected.
  return profile;
};

export const getProfilesForServiceArea = async (
  serviceId: string,
  location: TunisiaGovernorateId,
) => {
  const service = await Service.findOne({ _id: serviceId, active: true });
  if (!service) {
    return [];
  }

  const profiles = await TechnicianProfile.find({
    active: true,
    offerings: {
      $elemMatch: {
        serviceId: new mongoose.Types.ObjectId(serviceId),
        governorates: location,
      },
    },
  }).sort({ displayName: 1 });
  const ratingsByProfile = await getTechnicianRatingSummaries(
    profiles.map((profile) => profile.id),
  );

  return profiles.map((profile) => ({
    profile,
    ratings: ratingsByProfile.get(profile.id) ?? { average: null, count: 0 },
    service: { id: service.id, name: service.name },
    offering: profile.offerings.find(
      (item) =>
        item.serviceId.toString() === serviceId &&
        item.governorates.includes(location),
    ),
  }));
};

//! add update technicien profile( technicien can update name, service, and location of service), 
//! activate/deactivate profile and delete profile

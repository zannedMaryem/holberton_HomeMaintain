import mongoose from "mongoose";
import Problem from "../models/Problem";
import Service from "../models/Service";
import TechnicianProfile from "../models/TechnicianProfile";

const createServiceSlug = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const createService = async (name: string) => {
  const slug = createServiceSlug(name);
  if (!slug) {
    throw new Error("Service name must contain letters or numbers");
  }

  try {
    return await Service.create({
      name,
      slug,
      description: `Home maintenance service for ${name.toLowerCase()}.`,
      active: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("A service with this name already exists");
    }

    throw error;
  }
};

export const listActiveServices = async () =>
  Service.find({ active: true }).sort({ name: 1 });

export const changeServiceStatus = async (
  serviceId: string,
  active: boolean,
) => {
  const service = await Service.findByIdAndUpdate(
    serviceId,
    { $set: { active } },
    { new: true, runValidators: true },
  );
  if (service === null) {
    throw new Error("Service not found");
  }

  return service;
};

export const deleteService = async (serviceId: string) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  const [hasJobs, hasTechnicianOfferings] = await Promise.all([
    Problem.exists({ serviceId }),
    TechnicianProfile.exists({ "offerings.serviceId": serviceId }),
  ]);
  if (hasJobs || hasTechnicianOfferings) {
    throw new Error("Service is in use and cannot be deleted");
  }

  await service.deleteOne();
  return service;
};

export const getActiveService = async (serviceId: string) => {
  const service = await Service.findOne({ _id: serviceId, active: true });
  if (!service) {
    throw new Error("Service not found or inactive");
  }

  return service;
};

export const validateActiveServiceIds = async (serviceIds: string[]) => {
  const uniqueIds = [...new Set(serviceIds)];
  if (uniqueIds.length !== serviceIds.length) {
    throw new Error("Service IDs must not contain duplicates");
  }

  const services = await Service.find({
    _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) },
    active: true,
  });
  if (services.length !== uniqueIds.length) {
    throw new Error("Every selected service must exist and be active");
  }

  return services;
};

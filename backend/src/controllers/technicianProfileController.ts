import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  isTunisiaGovernorateId,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";
import {
  getTechnicianProfile,
  saveTechnicianProfile,
  deactivateTechnicianProfile,
  getProfilesForServiceArea,
  type TechnicianProfileInput,
} from "../services/technicianProfileService";
import {
  isValidTechnicianPhotoDataUrl,
  MAX_TECHNICIAN_PHOTO_DATA_URL_LENGTH,
} from "../utils/technicianPhoto";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateProfileBody = (
  body: unknown,
  res: Response,
): TechnicianProfileInput | undefined => {
  if (
    !isJsonObject(body) ||
    Object.keys(body).some(
      (key) =>
        ![
          "displayName",
          "description",
          "photoDataUrl",
          "active",
          "offerings",
        ].includes(key),
    )
  ) {
    res.status(400).json({ message: "A profile object with supported fields is required" });
    return undefined;
  }

  const { displayName, description, photoDataUrl, active, offerings } = body;
  if (
    typeof displayName !== "string" ||
    displayName.trim().length < 2 ||
    displayName.trim().length > 50
  ) {
    res.status(400).json({
      message: "displayName must contain between 2 and 50 characters",
    });
    return undefined;
  }
  if (
    typeof description !== "string" ||
    description.trim().length < 2 ||
    description.trim().length > 2000
  ) {
    res.status(400).json({
      message: "description must contain between 2 and 2000 characters",
    });
    return undefined;
  }
  if (active !== undefined && typeof active !== "boolean") {
    res.status(400).json({ message: "active must be a boolean" });
    return undefined;
  }
  if (
    photoDataUrl !== undefined &&
    photoDataUrl !== null &&
    !isValidTechnicianPhotoDataUrl(photoDataUrl)
  ) {
    res.status(400).json({
      message: `photoDataUrl must be a JPEG, PNG, or WebP data URL no larger than ${MAX_TECHNICIAN_PHOTO_DATA_URL_LENGTH} characters`,
    });
    return undefined;
  }
  if (!Array.isArray(offerings) || offerings.length === 0) {
    res.status(400).json({ message: "At least one service offering is required" });
    return undefined;
  }

  const normalizedOfferings: TechnicianProfileInput["offerings"] = [];
  const serviceIds = new Set<string>();
  for (const offering of offerings) {
    const normalizedServiceId =
      isJsonObject(offering) && typeof offering.serviceId === "string"
        ? offering.serviceId.toLowerCase()
        : "";
    if (
      !isJsonObject(offering) ||
      Object.keys(offering).some(
        (key) => key !== "serviceId" && key !== "governorates",
      ) ||
      typeof offering.serviceId !== "string" ||
      !mongoose.isObjectIdOrHexString(offering.serviceId) ||
      serviceIds.has(normalizedServiceId) ||
      !Array.isArray(offering.governorates) ||
      offering.governorates.length === 0 ||
      !offering.governorates.every(isTunisiaGovernorateId) ||
      new Set(offering.governorates).size !== offering.governorates.length
    ) {
      res.status(400).json({
        message:
          "Each offering needs a unique valid serviceId and one or more unique supported governorates",
      });
      return undefined;
    }

    serviceIds.add(normalizedServiceId);
    normalizedOfferings.push({
      serviceId: normalizedServiceId,
      governorates: offering.governorates as TunisiaGovernorateId[],
    });
  }

  return {
    displayName: displayName.trim(),
    description: description.trim(),
    photoDataUrl:
      typeof photoDataUrl === "string" || photoDataUrl === null
        ? photoDataUrl
        : undefined,
    active: active ?? true,
    offerings: normalizedOfferings,
  };
};

const serializeProfile = (
  result: Awaited<ReturnType<typeof getTechnicianProfile>>,
) => ({
  id: result.profile._id,
  displayName: result.profile.displayName,
  description: result.profile.description,
  photoDataUrl: result.profile.photoDataUrl,
  active: result.profile.active,
  ratings: result.ratings,
  offerings: result.offerings,
  createdAt: result.profile.createdAt,
  updatedAt: result.profile.updatedAt,
});

export const listTechnicians = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { serviceId, location } = req.query;
  if (
    typeof serviceId !== "string" ||
    !mongoose.isObjectIdOrHexString(serviceId)
  ) {
    res.status(400).json({ message: "A valid serviceId is required" });
    return;
  }
  if (!isTunisiaGovernorateId(location)) {
    res.status(400).json({ message: "A supported governorate location is required" });
    return;
  }

  try {
    const matches = await getProfilesForServiceArea(serviceId, location);
    res.status(200).json({
      data: matches
        .filter((match) => match.offering !== undefined)
        .map(({ profile, service, offering, ratings }) => ({
          id: profile.id,
          displayName: profile.displayName,
          description: profile.description,
          photoDataUrl: profile.photoDataUrl,
          service,
          governorates: offering?.governorates ?? [],
          ratings,
        })),
    });
  } catch (error) {
    console.error("List matching technicians error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyTechnicianProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const profile = await getTechnicianProfile(req.user.id);
    res.status(200).json({ data: serializeProfile(profile) });
  } catch (error) {
    if (error instanceof Error && error.message === "Technician profile not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    console.error("Get technician profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const putMyTechnicianProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const input = validateProfileBody(req.body, res);
  if (!input) return;

  try {
    const profile = await saveTechnicianProfile(req.user.id, input);
    res.status(200).json({
      message: "Technician profile saved successfully",
      data: serializeProfile(profile),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Service IDs must not contain duplicates",
        "Every selected service must exist and be active",
      ].includes(error.message)
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    ) {
      res.status(400).json({ message: "Invalid technician profile data" });
      return;
    }

    console.error("Save technician profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deactivateMyTechnicianProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const profile = await deactivateTechnicianProfile(req.user.id);
    res.status(200).json({
      message: "Technician profile deactivated; profile history was retained",
      data: {
        id: profile._id,
        active: profile.active,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Technician profile not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    console.error("Deactivate technician profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

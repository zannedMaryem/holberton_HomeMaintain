import { Request, Response } from "express";
import {
  changeServiceStatus,
  createService,
  deleteService,
  listActiveServices,
} from "../services/serviceService";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getServices = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const services = await listActiveServices();
    res.status(200).json({
      data: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        slug: service.slug,
      })),
    });
  } catch (error) {
    console.error("List services error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const postService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((field) => field !== "name")
  ) {
    res.status(400).json({ message: "A JSON object with only a name is required" });
    return;
  }

  const { name } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    res.status(400).json({
      message: "Service name must contain between 2 and 100 characters",
    });
    return;
  }

  try {
    const service = await createService(name.trim());
    res.status(201).json({
      message: "Service created successfully",
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        slug: service.slug,
        active: service.active,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "A service with this name already exists"
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "Service name must contain letters or numbers"
    ) {
      res.status(400).json({ message: error.message });
      return;
    }

    console.error("Create service error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const changeServiceActiveStatus = async (
  req: Request<{ serviceId: string }>,
  res: Response,
): Promise<void> => {
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 1 ||
    typeof req.body.active !== "boolean"
  ) {
    res.status(400).json({ message: "Request body must contain an active boolean" });
    return;
  }

  try {
    const service = await changeServiceStatus(
      req.params.serviceId,
      req.body.active,
    );
    res.status(200).json({
      message: "Service status updated successfully",
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        slug: service.slug,
        active: service.active,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Service not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    console.error("Update service status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeService = async (
  req: Request<{ serviceId: string }>,
  res: Response,
): Promise<void> => {
  try {
    await deleteService(req.params.serviceId);
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Service not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "Service is in use and cannot be deleted"
    ) {
      res.status(409).json({ message: error.message });
      return;
    }

    console.error("Delete service error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

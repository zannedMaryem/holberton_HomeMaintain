import { Request, Response } from "express";
import mongoose from "mongoose";
import { createJob, getOpenJobs, updateJob, deleteJob, getJobById } from "../services/jobService";
import { getActiveJobCategory } from "../services/jobCategoryService";
import {
  isTunisiaGovernorateId,
  type TunisiaGovernorateId,
} from "../constants/tunisiaGovernorates";

const fieldMaxLimits = {
  title: 72,
  description: 2000,
};

const fieldMinLimits = {
  title: 8,
  description: 2,
};

type JobTextField = "title" | "description";
type JobEditableField = JobTextField | "categoryId" | "location";

const validateJobText = (
  value: unknown,
  field: JobTextField,
  res: Response,
): string | undefined => {
  if (typeof value !== "string") {
    res.status(400).json({ message: `${field} must be a string` });
    return undefined;
  }

  if (value.trim().length === 0) {
    res.status(400).json({ message: `${field} is required` });
    return undefined;
  }
  const normalizedValue = value.trim();

  if (normalizedValue.length < fieldMinLimits[field]) {
    res.status(400).json({
      message: `${field} must contain at least ${fieldMinLimits[field]} characters`,
    });
    return undefined;
  }

  if (normalizedValue.length > fieldMaxLimits[field]) {
    res.status(400).json({
      message: `${field} must be under ${fieldMaxLimits[field]} characters`,
    });
    return undefined;
  }

  return normalizedValue;
};

export const postJob = async (req: Request, res: Response): Promise<void> => {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ message: "A JSON object is required" });
    return;
  }

  const jobBody = body as Record<string, unknown>;
  const allowedFields = [
    "title",
    "location",
    "categoryId",
    "description",
  ];
  if (Object.keys(jobBody).some((field) => !allowedFields.includes(field))) {
    res.status(400).json({ message: "The request contains an unsupported field" });
    return;
  }

  const title = validateJobText(jobBody.title, "title", res);
  if (title === undefined) return;

  if (!isTunisiaGovernorateId(jobBody.location)) {
    res.status(400).json({ message: "A valid Tunisia governorate is required as location" });
    return;
  }
  const location = jobBody.location;

  if (
    typeof jobBody.categoryId !== "string" ||
    !mongoose.isObjectIdOrHexString(jobBody.categoryId)
  ) {
    res.status(400).json({ message: "A valid categoryId is required" });
    return;
  }

  const description = validateJobText(jobBody.description, "description", res);
  if (description === undefined) return;

  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const { job, category, reporterFullName } = await createJob({
      reporterId: req.user.id,
      title,
      location,
      categoryId: jobBody.categoryId,
      description,
    });

    res.status(201).json({
      message: "Job successfully created",
      data: {
        id: job._id,
        reporter: {
          id: job.reporterId,
          fullName: reporterFullName,
        },
        title: job.title,
        location: job.location,
        category: category.name,
        description: job.description,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error("Create job error:", error);
    if (
      error instanceof Error &&
      error.message ===
        "Job with the same details already listed in your account"
    ) {
      res.status(409).json({ message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "Job category not found") {
      res.status(400).json({ message: error.message });
      return;
    }
      res.status(500).json({ message: "Server error" });
  }
};


export const updateOpenJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ message: "A JSON object is required" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const jobBody = body as Record<string, unknown>;
  const updates: Partial<Record<JobTextField, string>> & {
    categoryId?: mongoose.Types.ObjectId;
    location?: TunisiaGovernorateId;
  } = {};
  const allowedFields = [
    "title",
    "location",
    "description",
    "categoryId",
  ] as const;

  if (
    Object.keys(jobBody).some(
      (field) => !allowedFields.includes(field as JobEditableField),
    )
  ) {
    res.status(400).json({
      message: "You are not allowed to modify this field",
    });
    return;
  }

  for (const field of allowedFields) {
    if (jobBody[field] === undefined) continue;

    if (field === "categoryId") {
      if (
        typeof jobBody.categoryId !== "string" ||
        !mongoose.isObjectIdOrHexString(jobBody.categoryId)
      ) {
        res.status(400).json({ message: "A valid categoryId is required" });
        return;
      }

      try {
        await getActiveJobCategory(jobBody.categoryId);
      } catch (error) {
        if (error instanceof Error && error.message === "Job category not found") {
          res.status(400).json({ message: error.message });
          return;
        }

        console.error("Validate job category error:", error);
        res.status(500).json({ message: "Server error" });
        return;
      }

      updates.categoryId = new mongoose.Types.ObjectId(jobBody.categoryId);
      continue;
    }

    if (field === "location") {
      if (!isTunisiaGovernorateId(jobBody.location)) {
        res.status(400).json({
          message: "A valid Tunisia governorate is required as location",
        });
        return;
      }

      updates.location = jobBody.location;
      continue;
    }

    const value = validateJobText(jobBody[field], field, res);
    if (value === undefined) return; // ! validateJobText already sent a 400

    updates[field] = value;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ message: "At least one field is required" });
    return;
  }

  try {
    const { job, categoryName, reporterFullName } = await updateJob(
      req.params.jobId,
      req.user.id,
      updates,
    );

    res.status(200).json({
      message: "Job updated successfully",
      data: {
        id: job._id,
        reporter: {
          id: job.reporterId,
          fullName: reporterFullName,
        },
        title: job.title,
        location: job.location,
        category: categoryName,
        description: job.description,
        status: job.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Job not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "Unauthorized action") {
      res.status(403).json({ message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "Job is not open") {
      res.status(409).json({ message: error.message });
      return;
    }

    console.error("Update job error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const listOpenJobs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (req.query.status !== undefined && req.query.status !== "open") {
    res.status(400).json({ message: "Only open jobs can be listed" });
    return;
  }
  // Keep paging simple and bounded so a browse request cannot load every job.
  const page = parsePositiveInteger(req.query.page, 1, "page", res);
  if (page === undefined) return;

  const requestedLimit = parsePositiveInteger(req.query.limit, 20, "limit", res);
  if (requestedLimit === undefined) return;
  const limit = Math.min(requestedLimit, 100);
  if (!Number.isSafeInteger((page - 1) * limit)) {
    res.status(400).json({ message: "page is too large" });
    return;
  }

  let categoryId: string | undefined;
  if (req.query.categoryId !== undefined) {
    if (
      typeof req.query.categoryId !== "string" ||
      !mongoose.isObjectIdOrHexString(req.query.categoryId)
    ) {
      res.status(400).json({ message: "categoryId must be a valid ObjectId" });
      return;
    }

    try {
      await getActiveJobCategory(req.query.categoryId);
      categoryId = req.query.categoryId;
    } catch (error) {
      if (error instanceof Error && error.message === "Job category not found") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error("Validate job category filter error:", error);
      res.status(500).json({ message: "Server error" });
      return;
    }
  }

  let location: TunisiaGovernorateId | undefined;
  if (req.query.location !== undefined) {
    if (!isTunisiaGovernorateId(req.query.location)) {
      res.status(400).json({ message: "location must be a supported Tunisia governorate ID" });
      return;
    }

    location = req.query.location;
  }

  try {
    const { jobs, hasMore } = await getOpenJobs({
      page,
      limit,
      categoryId,
      location,
    });

    res.status(200).json({
      data: jobs.map(({ job, categoryName, reporterFullName }) => ({
        id: job._id,
        reporter: {
          id: job.reporterId,
          fullName: reporterFullName,
        },
        title: job.title,
        location: job.location,
        category: categoryName,
        description: job.description,
        createdAt: job.createdAt,
      })),
      pagination: {
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    console.error("List open jobs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const parsePositiveInteger = (
    value: unknown,
    defaultValue: number,
    field: "page" | "limit",
    res: Response,
): number | undefined => {
    if (value === undefined) return defaultValue;

    if (
      typeof value !== "string" ||
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value))
    ) {
      res.status(400).json({ message: `${field} must be a positive integer` });
      return undefined;
    }

    return Number(value);
};

export const getJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const { job, categoryName, reporterFullName } = await getJobById(
      req.params.jobId,
      req.user.id,
      req.user.role,
    );

    res.status(200).json({
      message: "Job retrieved successfully",
      data: {
        id: job._id,
        reporter: {
          id: job.reporterId,
          fullName: reporterFullName,
        },
        title: job.title,
        location: job.location,
        category: categoryName,
        description: job.description,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Job not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "Unauthorized action") {
      res.status(403).json({ message: error.message });
      return;
    }

    console.error("Get job error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteOpenJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    await deleteJob(req.params.jobId, req.user.id);
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Job not found") {
      res.status(404).json({message: error.message});
      return;
    }

    if (error instanceof Error && error.message === "Unauthorized action") {
      res.status(403).json({ message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "Job is not open") {
      res.status(409).json({ message: error.message });
      return;
    }

    console.error("Delete job error:", error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

import { Request, Response } from "express";
import { createJob, getOpenJobs, updateJob, deleteJob } from "../services/jobService";

const fieldMaxLimits = {
  title: 72,
  location: 200,
  category: 100,
  description: 2000,
};

const fieldMinLimits = {
  title: 8,
  location: 2,
  category: 2,
  description: 2,
};

type JobTextField = keyof typeof fieldMaxLimits;

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
  const title = validateJobText(jobBody.title, "title", res);
  if (title === undefined) return;

  const location = validateJobText(jobBody.location, "location", res);
  if (location === undefined) return;

  const category = validateJobText(jobBody.category, "category", res);
  if (category === undefined) return;

  const description = validateJobText(jobBody.description, "description", res);
  if (description === undefined) return;

  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const job = await createJob({
      reporterId: req.user.id,
      title,
      location,
      category,
      description,
    });

    res.status(201).json({
      message: "Job successfully created",
      data: {
        id: job._id,
        reporterId: job.reporterId,
        title: job.title,
        location: job.location,
        category: job.category,
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
        "Job with the same details alredy listed in your account"
    ) {
      res.status(400).json({message: error.message});
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

  const jobBody = body as Record<string, unknown>;
  const updates: Partial<Record<JobTextField, string>> = {};
  const allowedFields = [
    "title",
    "location",
    "category",
    "description",
  ] as const;

  if (
    Object.keys(jobBody).some(
      (field) => !allowedFields.includes(field as JobTextField),
    )
  ) {
    res.status(400).json({
      message: "You are not allowed to modify this field",
    });
    return;
  }

  for (const field of allowedFields) {
    if (jobBody[field] === undefined) continue;

    const value = validateJobText(jobBody[field], field, res);
    if (value === undefined) return; // ! validateJobText already sent a 400

    updates[field] = value;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ message: "At least one field is required" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const job = await updateJob(req.params.jobId, req.user.id, updates);

    res.status(200).json({
      message: "Job updated successfully",
      data: {
        id: job._id,
        title: job.title,
        location: job.location,
        category: job.category,
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

  try {
    const jobs = await getOpenJobs();

    res.status(200).json({
      data: jobs.map((job) => ({
        id: job._id,
        title: job.title,
        location: job.location,
        category: job.category,
        description: job.description,
        createdAt: job.createdAt,
      })),
    });
  } catch (error) {
    console.error("List open jobs error:", error);
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

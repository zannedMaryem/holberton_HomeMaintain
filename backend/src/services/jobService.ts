import Problem, { type IProblem } from "../models/Problem";
import type { IUser } from "../models/User";
import { getActiveJobCategory } from "./jobCategoryService";
import { createJobFingerprint } from "../utils/jobFingerprint";
import type { TunisiaGovernorateId } from "../constants/tunisiaGovernorates";

interface CreateJobInput {
  reporterId: string;
  title: string;
  location: string;
  governorateId: TunisiaGovernorateId;
  categoryId: string;
  description: string;
};

type JobUpdates = Partial<
  Pick<
    IProblem,
    "title" | "location" | "governorateId" | "categoryId" | "description"
  >
>;

const createJob = async ({
  reporterId,
  title,
  location,
  governorateId,
  categoryId,
  description,
}: CreateJobInput) => {
  const category = await getActiveJobCategory(categoryId);
  const duplicateFingerprint = createJobFingerprint(
    reporterId,
    location,
    governorateId,
    category.id,
    description,
  );

  try {
    // The unique partial index, not a prior read, is the concurrency-safe
    // authority for preventing duplicate open jobs.
    return await Problem.create({
      reporterId,
      title,
      location,
      governorateId,
      categoryId: category.id,
      description,
      duplicateFingerprint,
      status: "open",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Job with the same details already listed in your account");
    }

    throw error;
  }
};

const updateJob = async (
  jobId: string,
  reporterId: string,
  updates: JobUpdates,
) => {
  const problem = await Problem.findById(jobId);

  if (!problem) {
    throw new Error("Job not found");
  }

  if (problem.reporterId.toString() !== reporterId) {
    throw new Error("Unauthorized action");
  }

  if (problem.status !== "open") {
    throw new Error("Job is not open");
  }

  if (updates.categoryId !== undefined) {
    await getActiveJobCategory(updates.categoryId.toString());
  }

  Object.assign(problem, updates);
  problem.duplicateFingerprint = createJobFingerprint(
    reporterId,
    problem.location,
    problem.governorateId ?? "",
    problem.categoryId.toString(),
    problem.description,
  );

  try {
    await problem.save();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Job with the same details already listed in your account");
    }

    throw error;
  }

  return problem;
};

interface OpenJobFilters {
  page: number;
  limit: number;
  categoryId?: string;
  governorateId?: TunisiaGovernorateId;
  location?: string;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOpenJobs = async ({
  page,
  limit,
  categoryId,
  governorateId,
  location,
}: OpenJobFilters) => {
  // Keep status fixed to open; caller-controlled filters can only narrow results.
  const filter: Record<string, unknown> = { status: "open" };
  if (categoryId) filter.categoryId = categoryId;
  if (governorateId) filter.governorateId = governorateId;
  if (location) {
    filter.location = { $regex: escapeRegex(location), $options: "i" };
  }

  const [jobs, total] = await Promise.all([
    Problem.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Problem.countDocuments(filter),
  ]);

  return { jobs, total };
};

const getJobById = async (
  jobId: string,
  viewerId: string,
  viewerRole: IUser["role"],
) => {
  const problem = await Problem.findById(jobId);

  if (!problem) {
    throw new Error("Job not found");
  }

  if (viewerRole === "admin") {
    return problem;
  }

  if (viewerRole === "homeowner") {
    if (problem.reporterId.toString() !== viewerId) {
      throw new Error("Unauthorized action");
    }

    return problem;
  }

  if (viewerRole === "technician" && problem.status === "open") {
    return problem;
  }

  throw new Error("Job not found");
};

const deleteJob = async (jobId: string, reporterId: string) => {
  const problem = await Problem.findById(jobId);

  if (!problem) {
    throw new Error("Job not found");
  }

  if (problem.reporterId.toString() !== reporterId) {
    throw new Error("Unauthorized action");
  }

  if (problem.status !== "open") {
    throw new Error("Job is not open");
  }

  await Problem.deleteOne({
    _id: jobId,
    reporterId,
    status: "open",
  });
};

export { createJob, getOpenJobs, updateJob, deleteJob, getJobById };

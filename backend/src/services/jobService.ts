import Problem, { type IProblem } from "../models/Problem";
import JobCategory from "../models/JobCategory";
import User, { type IUser } from "../models/User";
import { getActiveJobCategory } from "./jobCategoryService";
import { createJobFingerprint } from "../utils/jobFingerprint";
import type { TunisiaGovernorateId } from "../constants/tunisiaGovernorates";

interface CreateJobInput {
  reporterId: string;
  title: string;
  location: TunisiaGovernorateId;
  categoryId: string;
  description: string;
};

type JobUpdates = Partial<
  Pick<
    IProblem,
    "title" | "location" | "categoryId" | "description"
  >
>;

interface JobDetails {
  job: IProblem;
  categoryName: string;
  reporterFullName: string;
}

const getJobDetails = async (job: IProblem): Promise<JobDetails> => {
  const [category, reporter] = await Promise.all([
    JobCategory.findById(job.categoryId).select("name"),
    User.findById(job.reporterId).select("firstName lastName"),
  ]);

  if (!category) {
    throw new Error("Job category not found");
  }
  if (!reporter) {
    throw new Error("Job reporter not found");
  }

  return {
    job,
    categoryName: category.name,
    reporterFullName: `${reporter.firstName} ${reporter.lastName}`,
  };
};

const createJob = async ({
  reporterId,
  title,
  location,
  categoryId,
  description,
}: CreateJobInput) => {
  const [category, reporter] = await Promise.all([
    getActiveJobCategory(categoryId),
    User.findById(reporterId).select("firstName lastName"),
  ]);
  if (!reporter) {
    throw new Error("User not found");
  }

  const duplicateFingerprint = createJobFingerprint(
    reporterId,
    location,
    category.id,
    description,
  );

  try {
    // The unique partial index, not a prior read, is the concurrency-safe
    // authority for preventing duplicate open jobs.
    const job = await Problem.create({
      reporterId,
      title,
      location,
      categoryId: category.id,
      description,
      duplicateFingerprint,
      status: "open",
    });

    return {
      job,
      category,
      reporterFullName: `${reporter.firstName} ${reporter.lastName}`,
    };
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
  const [category, reporter] = await Promise.all([
    JobCategory.findById(problem.categoryId).select("name"),
    User.findById(problem.reporterId).select("firstName lastName"),
  ]);
  if (!category) {
    throw new Error("Job category not found");
  }
  if (!reporter) {
    throw new Error("Job reporter not found");
  }

  problem.duplicateFingerprint = createJobFingerprint(
    reporterId,
    problem.location,
    problem.categoryId.toString(),
    problem.description,
  );

  try {
    // Validate modified fields only so pre-migration legacy locations don't
    // prevent an owner from editing another field on an existing job.
    await problem.save({ validateModifiedOnly: true });
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

  return {
    job: problem,
    categoryName: category.name,
    reporterFullName: `${reporter.firstName} ${reporter.lastName}`,
  };
};

interface OpenJobFilters {
  page: number;
  limit: number;
  categoryId?: string;
  location?: TunisiaGovernorateId;
}

const getOpenJobs = async ({
  page,
  limit,
  categoryId,
  location,
}: OpenJobFilters) => {
  // Keep status fixed to open; caller-controlled filters can only narrow results.
  const filter: Record<string, unknown> = { status: "open" };
  if (categoryId) filter.categoryId = categoryId;
  if (location) filter.location = location;

  // Fetch one extra record to tell clients whether another page exists without
  // running a separate count query for every browse request.
  const results = await Problem.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1);
  const hasMore = results.length > limit;

  const jobs = hasMore ? results.slice(0, limit) : results;
  const categoryIds = [...new Set(jobs.map((job) => job.categoryId.toString()))];
  const reporterIds = [...new Set(jobs.map((job) => job.reporterId.toString()))];
  const [categories, reporters] = await Promise.all([
    JobCategory.find({ _id: { $in: categoryIds } }).select("name"),
    User.find({ _id: { $in: reporterIds } }).select("firstName lastName"),
  ]);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const reporterNames = new Map(
    reporters.map((reporter) => [
      reporter.id,
      `${reporter.firstName} ${reporter.lastName}`,
    ]),
  );

  return {
    jobs: jobs.map((job) => {
      const categoryName = categoryNames.get(job.categoryId.toString());
      const reporterFullName = reporterNames.get(job.reporterId.toString());
      if (!categoryName) {
        throw new Error("Job category not found");
      }
      if (!reporterFullName) {
        throw new Error("Job reporter not found");
      }

      return { job, categoryName, reporterFullName };
    }),
    hasMore,
  };
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
    return getJobDetails(problem);
  }

  if (viewerRole === "homeowner") {
    if (problem.reporterId.toString() !== viewerId) {
      throw new Error("Unauthorized action");
    }

    return getJobDetails(problem);
  }

  if (viewerRole === "technician" && problem.status === "open") {
    return getJobDetails(problem);
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

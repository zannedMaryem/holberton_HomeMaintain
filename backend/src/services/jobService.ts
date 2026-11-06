import Problem, { type IProblem } from "../models/Problem";

interface CreateJobInput {
  reporterId: string;
  title: string;
  location: string;
  category: string;
  description: string;
};

type JobUpdates = Partial<
  Pick<IProblem, "title" | "location" | "category" | "description">
>;

const createJob = async ({
  reporterId,
  title,
  location,
  category,
  description,
}: CreateJobInput) => {
  const existingProblem = await Problem.findOne({reporterId, location, category, description})
  if (existingProblem) {
    throw new Error("Job with the same details alredy listed in your account");
  }
  return Problem.create({
    reporterId,
    title,
    location,
    category,
    description,
    status: "open",
  });
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

  Object.assign(problem, updates);
  await problem.save();

  return problem;
};

const getOpenJobs = async () => {
  return Problem.find({ status: "open" }).sort({ createdAt: -1 });
};

const getJob = async (jobId: string) => {
  const problem = await Problem.findById(jobId);
  if (!problem) {
    throw new Error("Job not found");
  }
  return problem;
}

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

export { createJob, getOpenJobs, updateJob, deleteJob};

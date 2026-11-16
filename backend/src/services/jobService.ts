import Problem, { type IProblem } from "../models/Problem";
import Service from "../models/Service";
import User, { type IUser } from "../models/User";
import TechnicianProfile from "../models/TechnicianProfile";
import JobApplication, {
  type JobApplicationStatus,
} from "../models/JobApplication";
import { getActiveService } from "./serviceService";
import { createJobFingerprint } from "../utils/jobFingerprint";
import type { TunisiaGovernorateId } from "../constants/tunisiaGovernorates";
import { getProfilesForServiceArea } from "./technicianProfileService";

interface CreateJobInput {
  reporterId: string;
  title: string;
  location: TunisiaGovernorateId;
  serviceId: string;
  description: string;
};

type JobUpdates = Partial<
  Pick<
    IProblem,
    "title" | "location" | "serviceId" | "description"
  >
>;

interface JobDetails {
  job: IProblem;
  service: { id: string; name: string };
  reporterFullName: string;
}

const getJobDetails = async (job: IProblem): Promise<JobDetails> => {
  const [service, reporter] = await Promise.all([
    Service.findById(job.serviceId).select("name"),
    User.findById(job.reporterId).select("firstName lastName"),
  ]);

  if (!service) {
    throw new Error("Job service not found");
  }
  if (!reporter) {
    throw new Error("Job reporter not found");
  }

  return {
    job,
    service: { id: service.id, name: service.name },
    reporterFullName: `${reporter.firstName} ${reporter.lastName}`,
  };
};

const createJob = async ({
  reporterId,
  title,
  location,
  serviceId,
  description,
}: CreateJobInput) => {
  const [service, reporter] = await Promise.all([
    getActiveService(serviceId),
    User.findById(reporterId).select("firstName lastName"),
  ]);
  if (!reporter) {
    throw new Error("User not found");
  }

  const duplicateFingerprint = createJobFingerprint(
    reporterId,
    location,
    service.id,
    description,
  );

  try {
    // The unique partial index, not a prior read, is the concurrency-safe
    // authority for preventing duplicate open jobs.
    const job = await Problem.create({
      reporterId,
      title,
      location,
      serviceId: service.id,
      description,
      duplicateFingerprint,
      status: "open",
    });

    return {
      job,
      service,
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

  if (updates.serviceId !== undefined) {
    await getActiveService(updates.serviceId.toString());
  }

  Object.assign(problem, updates);
  const [service, reporter] = await Promise.all([
    Service.findById(problem.serviceId).select("name"),
    User.findById(problem.reporterId).select("firstName lastName"),
  ]);
  if (!service) {
    throw new Error("Job service not found");
  }
  if (!reporter) {
    throw new Error("Job reporter not found");
  }

  problem.duplicateFingerprint = createJobFingerprint(
    reporterId,
    problem.location,
    problem.serviceId.toString(),
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

  return {
    job: problem,
    service: { id: service.id, name: service.name },
    reporterFullName: `${reporter.firstName} ${reporter.lastName}`,
  };
};

interface OpenJobFilters {
  page: number;
  limit: number;
  serviceId?: string;
  location?: TunisiaGovernorateId;
}

const getOpenJobs = async ({
  page,
  limit,
  serviceId,
  location,
}: OpenJobFilters) => {
  // Keep status fixed to open; caller-controlled filters can only narrow results.
  const filter: Record<string, unknown> = { status: "open" };
  if (serviceId) filter.serviceId = serviceId;
  if (location) filter.location = location;

  // Fetch one extra record to tell clients whether another page exists without
  // running a separate count query for every browse request.
  const results = await Problem.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1);
  const hasMore = results.length > limit;

  const jobs = hasMore ? results.slice(0, limit) : results;
  const serviceIds = [...new Set(jobs.map((job) => job.serviceId.toString()))];
  const reporterIds = [...new Set(jobs.map((job) => job.reporterId.toString()))];
  const [services, reporters] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } }).select("name"),
    User.find({ _id: { $in: reporterIds } }).select("firstName lastName"),
  ]);
  const servicesById = new Map(
    services.map((service) => [service.id, { id: service.id, name: service.name }]),
  );
  const reporterNames = new Map(
    reporters.map((reporter) => [
      reporter.id,
      `${reporter.firstName} ${reporter.lastName}`,
    ]),
  );

  return {
    jobs: jobs.map((job) => {
      const service = servicesById.get(job.serviceId.toString());
      const reporterFullName = reporterNames.get(job.reporterId.toString());
      if (!service) {
        throw new Error("Job service not found");
      }
      if (!reporterFullName) {
        throw new Error("Job reporter not found");
      }

      return { job, service, reporterFullName };
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

  if (viewerRole === "technician") {
    if (problem.status === "open") {
      return getJobDetails(problem);
    }

    const profile = await TechnicianProfile.findOne({ userId: viewerId }).select("_id");
    if (
      profile &&
      problem.assignedTechnicianProfileId?.toString() === profile.id
    ) {
      return getJobDetails(problem);
    }
  }

  throw new Error("Job not found");
};

const getJobsForUser = async (
  userId: string,
  role: "homeowner" | "technician",
) => {
  let jobs: IProblem[];
  const applicationStatuses = new Map<string, JobApplicationStatus>();

  if (role === "homeowner") {
    jobs = await Problem.find({ reporterId: userId }).sort({
      updatedAt: -1,
      createdAt: -1,
      _id: -1,
    });
  } else {
    const profile = await TechnicianProfile.findOne({ userId }).select("_id");
    if (!profile) return [];

    const applications = await JobApplication.find({
      technicianProfileId: profile._id,
    }).select("jobId status");
    const jobIds = new Set(
      applications.map((application) => application.jobId.toString()),
    );
    for (const application of applications) {
      applicationStatuses.set(
        application.jobId.toString(),
        application.status,
      );
    }

    // Include direct assignments even if they were made without an application.
    const assignedJobs = await Problem.find({
      assignedTechnicianProfileId: profile._id,
    }).select("_id");
    for (const job of assignedJobs) jobIds.add(job._id.toString());

    jobs = await Problem.find({ _id: { $in: [...jobIds] } }).sort({
      updatedAt: -1,
      createdAt: -1,
      _id: -1,
    });
  }

  if (jobs.length === 0) return [];

  const serviceIds = [...new Set(jobs.map((job) => job.serviceId.toString()))];
  const reporterIds = [...new Set(jobs.map((job) => job.reporterId.toString()))];
  const technicianProfileIds = [
    ...new Set(
      jobs
        .map((job) => job.assignedTechnicianProfileId?.toString())
        .filter((id): id is string => id !== undefined),
    ),
  ];
  const [services, reporters, technicianProfiles] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } }).select("name"),
    User.find({ _id: { $in: reporterIds } }).select("firstName lastName"),
    TechnicianProfile.find({ _id: { $in: technicianProfileIds } }).select(
      "displayName photoDataUrl",
    ),
  ]);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const reportersById = new Map(
    reporters.map((reporter) => [reporter.id, reporter]),
  );
  const technicianProfilesById = new Map(
    technicianProfiles.map((profile) => [profile.id, profile]),
  );

  return jobs.map((job) => {
    const service = servicesById.get(job.serviceId.toString());
    const reporter = reportersById.get(job.reporterId.toString());
    const assignedTechnician = job.assignedTechnicianProfileId
      ? technicianProfilesById.get(job.assignedTechnicianProfileId.toString())
      : undefined;
    if (!service || !reporter) {
      throw new Error("Job references missing service or homeowner");
    }
    if (job.assignedTechnicianProfileId && !assignedTechnician) {
      throw new Error("Job references a missing technician profile");
    }

    return {
      id: job._id.toString(),
      reporter: {
        id: job.reporterId.toString(),
        fullName: `${reporter.firstName} ${reporter.lastName}`,
      },
      title: job.title,
      location: job.location,
      service: { id: service.id, name: service.name },
      description: job.description,
      status: job.status,
      assignedTechnicianProfileId: job.assignedTechnicianProfileId?.toString(),
      assignedTechnician: assignedTechnician
        ? {
            id: assignedTechnician.id,
            displayName: assignedTechnician.displayName,
            photoDataUrl: assignedTechnician.photoDataUrl,
          }
        : undefined,
      scheduledDate: job.scheduledDate,
      scheduledSlot: job.scheduledSlot,
      ratings: {
        homeowner: job.homeownerRating?.score,
        technician: job.technicianRating?.score,
      },
      applicationStatus: applicationStatuses.get(job._id.toString()),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  });
};

export const getMatchingTechnicians = async (
  jobId: string,
  homeownerId: string,
) => {
  const job = await Problem.findOne({
    _id: jobId,
    reporterId: homeownerId,
    status: "open",
  });
  if (!job) {
    throw new Error("Open job not found");
  }

  const matches = await getProfilesForServiceArea(
    job.serviceId.toString(),
    job.location,
  );
  return matches
    .filter((match) => match.offering !== undefined)
    .map(({ profile }) => ({
      id: profile.id,
      displayName: profile.displayName,
      description: profile.description,
    }));
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

export {
  createJob,
  getOpenJobs,
  updateJob,
  deleteJob,
  getJobById,
  getJobsForUser,
};

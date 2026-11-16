import JobApplication from "../models/JobApplication";
import Problem from "../models/Problem";
import Service from "../models/Service";
import TechnicianProfile from "../models/TechnicianProfile";

export const createJobApplication = async (
  jobId: string,
  technicianUserId: string,
  proposalMessage: string,
) => {
  const job = await Problem.findOne({ _id: jobId, status: "open" });
  if (!job) {
    throw new Error("Open job not found");
  }
  const service = await Service.findOne({ _id: job.serviceId, active: true });
  if (!service) {
    throw new Error("Job service is not active");
  }
  if (job.reporterId.toString() === technicianUserId) {
    throw new Error("You cannot apply to your own job");
  }

  const profile = await TechnicianProfile.findOne({
    userId: technicianUserId,
    active: true,
  });
  if (!profile) {
    throw new Error("Active technician profile not found");
  }

  const canProvideService = profile.offerings.some(
    (offering) =>
      offering.serviceId.toString() === job.serviceId.toString() &&
      offering.governorates.includes(job.location),
  );
  if (!canProvideService) {
    throw new Error("Technician does not offer this service in the job governorate");
  }

  // Reopening a job cancels its prior accepted proposal; that technician may
  // submit a fresh proposal without creating a duplicate application record.
  const cancelledApplication = await JobApplication.findOneAndUpdate(
    {
      jobId,
      technicianProfileId: profile._id,
      status: "cancelled",
    },
    {
      $set: { proposalMessage, status: "pending" },
    },
    { new: true, runValidators: true },
  );
  if (cancelledApplication) {
    return cancelledApplication;
  }

  try {
    return await JobApplication.create({
      jobId,
      technicianProfileId: profile.id,
      proposalMessage,
      status: "pending",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("You have already applied to this job");
    }

    throw error;
  }
};

export const listJobApplications = async (
  jobId: string,
  homeownerId: string,
) => {
  const job = await Problem.findById(jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.reporterId.toString() !== homeownerId) {
    throw new Error("Unauthorized action");
  }

  const applications = await JobApplication.find({ jobId }).sort({
    createdAt: -1,
  });
  const profileIds = applications.map((application) =>
    application.technicianProfileId.toString(),
  );
  const profiles = await TechnicianProfile.find({
    _id: { $in: profileIds },
  }).select("displayName description");
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  return applications.map((application) => {
    const profile = profilesById.get(
      application.technicianProfileId.toString(),
    );
    if (!profile) {
      throw new Error("Job application references a missing technician profile");
    }

    return {
      id: application.id,
      technician: {
        id: profile.id,
        displayName: profile.displayName,
        description: profile.description,
      },
      proposalMessage: application.proposalMessage,
      status: application.status,
      createdAt: application.createdAt,
    };
  });
};

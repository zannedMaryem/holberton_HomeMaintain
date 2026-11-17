import JobApplication from "../models/JobApplication";
import Problem from "../models/Problem";
import Service from "../models/Service";
import TechnicianProfile from "../models/TechnicianProfile";

const getOwnedOpenJob = async (jobId: string, homeownerId: string) => {
  const job = await Problem.findById(jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.reporterId.toString() !== homeownerId) {
    throw new Error("Unauthorized action");
  }
  if (job.status !== "open") {
    throw new Error("Job is not open");
  }

  const service = await Service.findOne({ _id: job.serviceId, active: true });
  if (!service) {
    throw new Error("Job service is not active");
  }

  return job;
};

const assignTechnicianToJob = async (
  jobId: string,
  homeownerId: string,
  technicianProfileId: string,
  applicationId?: string,
) => {
  const job = await getOwnedOpenJob(jobId, homeownerId);
  const profile = await TechnicianProfile.findOne({
    _id: technicianProfileId,
    active: true,
  });
  if (!profile) {
    throw new Error("Active technician profile not found");
  }

  const offersJob = profile.offerings.some(
    (offering) =>
      offering.serviceId.toString() === job.serviceId.toString() &&
      offering.governorates.includes(job.location),
  );
  if (!offersJob) {
    throw new Error("Technician does not offer this service in the job governorate");
  }

  if (applicationId) {
    const application = await JobApplication.findOne({
      _id: applicationId,
      jobId,
      technicianProfileId,
      status: "pending",
    });
    if (!application) {
      throw new Error("Pending job application not found");
    }
  }

  const assignedJob = await Problem.findOneAndUpdate(
    { _id: jobId, reporterId: homeownerId, status: "open" },
    {
      $set: {
        status: "assigned",
        assignedTechnicianProfileId: profile._id,
      },
    },
    { new: true, runValidators: true },
  );
  if (!assignedJob) {
    throw new Error("Job is no longer open");
  }

  let acceptedApplication;
  if (applicationId) {
    acceptedApplication = await JobApplication.findOneAndUpdate(
      { _id: applicationId, jobId, technicianProfileId },
      { $set: { status: "accepted" } },
      { new: true, runValidators: true },
    );
    if (!acceptedApplication) {
      throw new Error("Pending job application not found");
    }
  }

  // Once a job is assigned, no other pending proposal can still be selected.
  await JobApplication.updateMany(
    {
      jobId,
      status: "pending",
      ...(applicationId ? { _id: { $ne: applicationId } } : {}),
    },
    { $set: { status: "declined" } },
  );

  return { job: assignedJob, profile, application: acceptedApplication };
};

const declineJobApplication = async (
  jobId: string,
  homeownerId: string,
  applicationId: string,
) => {
  await getOwnedOpenJob(jobId, homeownerId);
  const application = await JobApplication.findOneAndUpdate(
    { _id: applicationId, jobId, status: "pending" },
    { $set: { status: "declined" } },
    { new: true, runValidators: true },
  );
  if (!application) {
    throw new Error("Pending job application not found");
  }

  return application;
};

const respondToHomeownerRequest = async (
  jobId: string,
  technicianUserId: string,
  applicationId: string,
  decision: "accept" | "decline",
) => {
  const profile = await TechnicianProfile.findOne({
    userId: technicianUserId,
    active: true,
  });
  if (!profile) throw new Error("Active technician profile not found");

  const application = await JobApplication.findOne({
    _id: applicationId,
    jobId,
    technicianProfileId: profile._id,
    requestType: "homeowner_request",
    status: "pending",
  });
  if (!application) throw new Error("Pending job application not found");

  const job = await Problem.findOne({ _id: jobId, status: "open" });
  if (!job) throw new Error("Job is no longer open");

  if (decision === "decline") {
    const declined = await JobApplication.findOneAndUpdate(
      { _id: application._id, status: "pending" },
      { $set: { status: "declined" } },
      { new: true, runValidators: true },
    );
    if (!declined) throw new Error("Pending job application not found");
    return { application: declined };
  }

  return assignTechnicianToJob(
    job.id,
    job.reporterId.toString(),
    profile.id,
    application.id,
  );
};

export {
  assignTechnicianToJob,
  declineJobApplication,
  respondToHomeownerRequest,
};

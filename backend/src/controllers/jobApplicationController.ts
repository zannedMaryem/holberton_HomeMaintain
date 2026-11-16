import { Request, Response } from "express";
import mongoose from "mongoose";
import JobApplication from "../models/JobApplication";
import {
  createJobApplication,
  listJobApplications,
} from "../services/jobApplicationService";
import {
  assignTechnicianToJob,
  declineJobApplication,
} from "../services/jobAssignmentService";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const handleWorkflowError = (
  error: unknown,
  res: Response,
  operation: string,
): void => {
  if (!(error instanceof Error)) {
    console.error(`${operation} failed:`, error);
    res.status(500).json({ message: "Server error" });
    return;
  }

  if (
    error.message === "Job not found" ||
    error.message === "Open job not found" ||
    error.message === "Active technician profile not found" ||
    error.message === "Pending job application not found"
  ) {
    res.status(404).json({ message: error.message });
    return;
  }
  if (error.message === "Unauthorized action") {
    res.status(403).json({ message: error.message });
    return;
  }
  if (
    error.message === "Job is not open" ||
    error.message === "Job is no longer open" ||
    error.message === "Job service is not active"
  ) {
    res.status(409).json({ message: error.message });
    return;
  }
  if (
    error.message === "You cannot apply to your own job" ||
    error.message === "Technician does not offer this service in the job governorate" ||
    error.message === "You have already applied to this job"
  ) {
    res.status(409).json({ message: error.message });
    return;
  }

  console.error(`${operation} failed:`, error);
  res.status(500).json({ message: "Server error" });
};

export const postJobApplication = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((key) => key !== "proposalMessage") ||
    typeof req.body.proposalMessage !== "string" ||
    req.body.proposalMessage.trim().length < 2 ||
    req.body.proposalMessage.trim().length > 2000
  ) {
    res.status(400).json({
      message: "proposalMessage must contain between 2 and 2000 characters",
    });
    return;
  }

  try {
    const application = await createJobApplication(
      req.params.jobId,
      req.user.id,
      req.body.proposalMessage.trim(),
    );
    res.status(201).json({
      message: "Job application submitted successfully",
      data: {
        id: application.id,
        jobId: application.jobId,
        status: application.status,
        proposalMessage: application.proposalMessage,
        createdAt: application.createdAt,
      },
    });
  } catch (error) {
    handleWorkflowError(error, res, "Create job application");
  }
};

export const getJobApplications = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const applications = await listJobApplications(
      req.params.jobId,
      req.user.id,
    );
    res.status(200).json({ data: applications });
  } catch (error) {
    handleWorkflowError(error, res, "List job applications");
  }
};

export const assignJobTechnician = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).some((key) => key !== "technicianProfileId") ||
    typeof req.body.technicianProfileId !== "string" ||
    !mongoose.isObjectIdOrHexString(req.body.technicianProfileId)
  ) {
    res.status(400).json({
      message: "A valid technicianProfileId is required",
    });
    return;
  }

  try {
    const { job, profile } = await assignTechnicianToJob(
      req.params.jobId,
      req.user.id,
      req.body.technicianProfileId,
    );
    res.status(200).json({
      message: "Technician assigned to job successfully",
      data: {
        jobId: job.id,
        status: job.status,
        technician: {
          id: profile.id,
          displayName: profile.displayName,
        },
      },
    });
  } catch (error) {
    handleWorkflowError(error, res, "Assign technician");
  }
};

export const decideJobApplication = async (
  req: Request<{ jobId: string; applicationId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 1 ||
    (req.body.decision !== "accept" && req.body.decision !== "decline")
  ) {
    res.status(400).json({ message: 'decision must be "accept" or "decline"' });
    return;
  }

  try {
    if (req.body.decision === "decline") {
      const application = await declineJobApplication(
        req.params.jobId,
        req.user.id,
        req.params.applicationId,
      );
      res.status(200).json({
        message: "Job application declined successfully",
        data: { id: application.id, status: application.status },
      });
      return;
    }

    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      jobId: req.params.jobId,
      status: "pending",
    });
    if (!application) {
      res.status(404).json({ message: "Pending job application not found" });
      return;
    }

    const { job, profile, application: acceptedApplication } = await assignTechnicianToJob(
      req.params.jobId,
      req.user.id,
      application.technicianProfileId.toString(),
      application.id,
    );
    if (!acceptedApplication) {
      throw new Error("Accepted job application was not returned");
    }
    res.status(200).json({
      message: "Technician assigned to job successfully",
      data: {
        jobId: job.id,
        status: job.status,
        technician: { id: profile.id, displayName: profile.displayName },
        applicationId: acceptedApplication.id,
        applicationStatus: acceptedApplication.status,
      },
    });
  } catch (error) {
    handleWorkflowError(error, res, "Decide job application");
  }
};

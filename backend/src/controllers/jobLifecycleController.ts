import { Request, Response } from "express";
import {
  cancelAssignedJob,
  completeAssignedJob,
  getJobAvailability,
  reserveJobTimeSlot,
  submitJobRating,
} from "../services/jobLifecycleService";
import { isValidJobRatingScore } from "../utils/jobRating";
import { isJobTimeSlot, isValidJobDate } from "../utils/jobScheduling";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const handleLifecycleError = (
  error: unknown,
  res: Response,
  operation: string,
): void => {
  if (!(error instanceof Error)) {
    console.error(`${operation} failed:`, error);
    res.status(500).json({ message: "Server error" });
    return;
  }

  if (error.message === "Job not found") {
    res.status(404).json({ message: error.message });
    return;
  }
  if (error.message === "Unauthorized action") {
    res.status(403).json({ message: error.message });
    return;
  }
  if (
    error.message === "Job is not assigned" ||
    error.message === "Job is no longer assigned" ||
    error.message === "Another open job with the same details already exists" ||
    error.message === "Job must be completed before it can be rated" ||
    error.message === "Time slot is no longer available" ||
    error.message === "Selected time slot has already started" ||
    error.message === "You have already rated this job"
  ) {
    res.status(409).json({ message: error.message });
    return;
  }
  if (
    error.message === "date cannot be in the past" ||
    error.message === "date must be a valid YYYY-MM-DD calendar date" ||
    error.message === "slot must be morning or afternoon" ||
    error.message === "score must be a whole number from 1 to 5"
  ) {
    res.status(400).json({ message: error.message });
    return;
  }

  console.error(`${operation} failed:`, error);
  res.status(500).json({ message: "Server error" });
};

export const getJobTimeSlotAvailability = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    typeof req.query.date !== "string" ||
    !isValidJobDate(req.query.date)
  ) {
    res.status(400).json({
      message: "date must be a valid YYYY-MM-DD calendar date",
    });
    return;
  }

  try {
    const availability = await getJobAvailability(
      req.params.jobId,
      req.user.id,
      req.user.role === "technician" ? "technician" : "homeowner",
      req.query.date,
    );
    res.status(200).json({ data: availability });
  } catch (error) {
    handleLifecycleError(error, res, "Get job time-slot availability");
  }
};

export const scheduleAssignedJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 2 ||
    typeof req.body.date !== "string" ||
    !isJobTimeSlot(req.body.slot)
  ) {
    res.status(400).json({
      message: 'date and slot ("morning" or "afternoon") are required',
    });
    return;
  }

  try {
    const job = await reserveJobTimeSlot(
      req.params.jobId,
      req.user.id,
      req.user.role === "technician" ? "technician" : "homeowner",
      req.body.date,
      req.body.slot,
    );
    res.status(200).json({
      message: "Technician intervention scheduled successfully",
      data: {
        jobId: job._id.toString(),
        status: job.status,
        date: job.scheduledDate,
        slot: job.scheduledSlot,
      },
    });
  } catch (error) {
    handleLifecycleError(error, res, "Schedule assigned job");
  }
};

export const cancelAndReopenAssignedJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    req.body !== undefined &&
    (!isJsonObject(req.body) || Object.keys(req.body).length !== 0)
  ) {
    res.status(400).json({ message: "The request body must be empty" });
    return;
  }

  try {
    const job = await cancelAssignedJob(req.params.jobId, req.user.id);
    res.status(200).json({
      message: "Job assignment cancelled and job reopened",
      data: { jobId: job._id.toString(), status: job.status },
    });
  } catch (error) {
    handleLifecycleError(error, res, "Cancel and reopen assigned job");
  }
};

export const markAssignedJobComplete = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    req.body !== undefined &&
    (!isJsonObject(req.body) || Object.keys(req.body).length !== 0)
  ) {
    res.status(400).json({ message: "The request body must be empty" });
    return;
  }

  try {
    const job = await completeAssignedJob(req.params.jobId, req.user.id);
    res.status(200).json({
      message: "Job marked as complete",
      data: { jobId: job._id.toString(), status: job.status },
    });
  } catch (error) {
    handleLifecycleError(error, res, "Complete assigned job");
  }
};

export const rateCompletedJob = async (
  req: Request<{ jobId: string }>,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (
    !isJsonObject(req.body) ||
    Object.keys(req.body).length !== 1 ||
    !isValidJobRatingScore(req.body.score)
  ) {
    res.status(400).json({ message: "score must be a whole number from 1 to 5" });
    return;
  }

  try {
    const job = await submitJobRating(
      req.params.jobId,
      req.user.id,
      req.user.role === "technician" ? "technician" : "homeowner",
      req.body.score,
    );
    res.status(201).json({
      message: "Rating submitted successfully",
      data: { jobId: job._id.toString(), score: req.body.score },
    });
  } catch (error) {
    handleLifecycleError(error, res, "Rate completed job");
  }
};

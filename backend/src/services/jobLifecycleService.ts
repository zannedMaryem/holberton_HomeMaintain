import mongoose from "mongoose";
import JobApplication from "../models/JobApplication";
import Problem, { type IProblem, type JobTimeSlot } from "../models/Problem";
import TechnicianProfile from "../models/TechnicianProfile";
import {
  getAvailableJobTimeSlots,
  isJobDateBeforeToday,
  isValidJobDate,
  JOB_TIME_SLOTS,
} from "../utils/jobScheduling";
import { isValidJobRatingScore } from "../utils/jobRating";

type AssignedJobActorRole = "homeowner" | "technician";

const getAssignedJobForActor = async (
  jobId: string,
  actorId: string,
  actorRole: AssignedJobActorRole,
) => {
  const job = await Problem.findById(jobId);
  if (!job) throw new Error("Job not found");

  if (actorRole === "homeowner") {
    if (job.reporterId.toString() !== actorId) {
      throw new Error("Unauthorized action");
    }
  } else {
    const profile = await TechnicianProfile.findOne({ userId: actorId });
    if (
      !profile ||
      job.assignedTechnicianProfileId?.toString() !== profile.id
    ) {
      throw new Error("Unauthorized action");
    }
  }

  if (job.status !== "assigned" || !job.assignedTechnicianProfileId) {
    throw new Error("Job is not assigned");
  }
  return job;
};

export const getJobAvailability = async (
  jobId: string,
  actorId: string,
  actorRole: AssignedJobActorRole,
  date: string,
) => {
  if (!isValidJobDate(date)) {
    throw new Error("date must be a valid YYYY-MM-DD calendar date");
  }
  if (isJobDateBeforeToday(date)) {
    throw new Error("date cannot be in the past");
  }

  const job = await getAssignedJobForActor(jobId, actorId, actorRole);
  const otherReservations = await Problem.find({
    _id: { $ne: job._id },
    assignedTechnicianProfileId: job.assignedTechnicianProfileId,
    scheduledDate: date,
    status: "assigned",
  }).select("scheduledSlot");
  const bookedSlots = new Set(
    otherReservations
      .map(({ scheduledSlot }) => scheduledSlot)
      .filter((slot): slot is JobTimeSlot => slot !== undefined),
  );

  return {
    date,
    timeZone: "Africa/Tunis",
    slots: getAvailableJobTimeSlots(date, bookedSlots),
  };
};

export const reserveJobTimeSlot = async (
  jobId: string,
  actorId: string,
  actorRole: AssignedJobActorRole,
  date: string,
  slot: JobTimeSlot,
): Promise<IProblem> => {
  if (!isValidJobDate(date)) {
    throw new Error("date must be a valid YYYY-MM-DD calendar date");
  }
  if (isJobDateBeforeToday(date)) {
    throw new Error("date cannot be in the past");
  }
  if (!JOB_TIME_SLOTS.some((timeSlot) => timeSlot.id === slot)) {
    throw new Error("slot must be morning or afternoon");
  }

  const job = await getAssignedJobForActor(jobId, actorId, actorRole);
  if (!getAvailableJobTimeSlots(date, new Set()).some((timeSlot) => timeSlot.id === slot)) {
    throw new Error("Selected time slot has already started");
  }

  try {
    // The unique index prevents either assigned party from double-booking a slot.
    const updatedJob = await Problem.findOneAndUpdate(
      {
        _id: job._id,
        ...(actorRole === "homeowner" ? { reporterId: actorId } : {}),
        status: "assigned",
        assignedTechnicianProfileId: job.assignedTechnicianProfileId,
      },
      { $set: { scheduledDate: date, scheduledSlot: slot } },
      { new: true, runValidators: true },
    );
    if (!updatedJob) {
      throw new Error("Job is no longer assigned");
    }
    return updatedJob;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Time slot is no longer available");
    }
    throw error;
  }
};

export const cancelAssignedJob = async (
  jobId: string,
  homeownerId: string,
): Promise<IProblem> => {
  const job = await Problem.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.reporterId.toString() !== homeownerId) {
    throw new Error("Unauthorized action");
  }
  if (job.status !== "assigned" || !job.assignedTechnicianProfileId) {
    throw new Error("Job is not assigned");
  }

  let reopenedJob: IProblem | null;
  try {
    reopenedJob = await Problem.findOneAndUpdate(
      { _id: job._id, reporterId: homeownerId, status: "assigned" },
      {
        $set: { status: "open" },
        $unset: {
          assignedTechnicianProfileId: "",
          scheduledDate: "",
          scheduledSlot: "",
        },
      },
      { new: true, runValidators: true },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Another open job with the same details already exists");
    }
    throw error;
  }

  if (!reopenedJob) {
    throw new Error("Job is no longer assigned");
  }

  await JobApplication.findOneAndUpdate(
    {
      jobId: job._id,
      technicianProfileId: job.assignedTechnicianProfileId,
      status: "accepted",
    },
    { $set: { status: "cancelled" } },
    { new: true, runValidators: true },
  );

  return reopenedJob;
};

export const completeAssignedJob = async (
  jobId: string,
  technicianUserId: string,
): Promise<IProblem> => {
  const job = await Problem.findById(jobId);
  if (!job) throw new Error("Job not found");
  const profile = await TechnicianProfile.findOne({ userId: technicianUserId });
  if (
    !profile ||
    job.assignedTechnicianProfileId?.toString() !== profile.id
  ) {
    throw new Error("Unauthorized action");
  }
  if (job.status !== "assigned") {
    throw new Error("Job is not assigned");
  }

  const completedJob = await Problem.findOneAndUpdate(
    {
      _id: job._id,
      assignedTechnicianProfileId: profile._id,
      status: "assigned",
    },
    { $set: { status: "completed" } },
    { new: true, runValidators: true },
  );
  if (!completedJob) {
    throw new Error("Job is no longer assigned");
  }
  return completedJob;
};

export const submitJobRating = async (
  jobId: string,
  userId: string,
  userRole: "homeowner" | "technician",
  score: number,
): Promise<IProblem> => {
  if (!isValidJobRatingScore(score)) {
    throw new Error("score must be a whole number from 1 to 5");
  }

  const job = await Problem.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "completed") {
    throw new Error("Job must be completed before it can be rated");
  }

  let ratingField: "homeownerRating" | "technicianRating";
  if (userRole === "homeowner") {
    if (job.reporterId.toString() !== userId) {
      throw new Error("Unauthorized action");
    }
    ratingField = "homeownerRating";
  } else {
    const profile = await TechnicianProfile.findOne({ userId });
    if (
      !profile ||
      job.assignedTechnicianProfileId?.toString() !== profile.id
    ) {
      throw new Error("Unauthorized action");
    }
    ratingField = "technicianRating";
  }

  const ratedJob = await Problem.findOneAndUpdate(
    {
      _id: job._id,
      status: "completed",
      [ratingField]: { $exists: false },
    },
    {
      $set: {
        [ratingField]: {
          reviewerId: new mongoose.Types.ObjectId(userId),
          score,
          createdAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!ratedJob) {
    throw new Error("You have already rated this job");
  }
  return ratedJob;
};

import { Router } from "express";
import mongoose from "mongoose";
import {
  listOpenJobs,
  postJob,
  updateOpenJob,
  deleteOpenJob,
  getJob,
  getJobMatchingTechnicians,
  listMyJobs,
  listMyTechnicianJobs,
} from "../controllers/jobController";
import {
  assignJobTechnician,
  decideJobApplication,
  getJobApplications,
  postJobApplication,
} from "../controllers/jobApplicationController";
import {
  cancelAndReopenAssignedJob,
  getJobTimeSlotAvailability,
  markAssignedJobComplete,
  rateCompletedJob,
  scheduleAssignedJob,
} from "../controllers/jobLifecycleController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();

router.param("jobId", (_req, res, next, jobId) => {
  if (!mongoose.isObjectIdOrHexString(jobId)) {
    res.status(400).json({ message: "Invalid job ID" });
    return;
  }

  next();
});

router.param("applicationId", (_req, res, next, applicationId) => {
  if (!mongoose.isObjectIdOrHexString(applicationId)) {
    res.status(400).json({ message: "Invalid job application ID" });
    return;
  }

  next();
});

router.get(
  "/technician/mine",
  authenticate,
  authorize("homeowner", "technician"),
  listMyTechnicianJobs,
);
router.get(
  "/mine",
  authenticate,
  authorize("homeowner", "technician"),
  listMyJobs,
);
router.get("/", authenticate, authorize("homeowner", "technician"), listOpenJobs);
router.get(
  "/:jobId/technicians",
  authenticate,
  authorize("homeowner"),
  getJobMatchingTechnicians,
);
router.get(
  "/:jobId/applications",
  authenticate,
  authorize("homeowner"),
  getJobApplications,
);
router.post(
  "/:jobId/applications",
  authenticate,
  authorize("homeowner", "technician"),
  postJobApplication,
);
router.patch(
  "/:jobId/applications/:applicationId",
  authenticate,
  authorize("homeowner", "technician"),
  decideJobApplication,
);
router.patch(
  "/:jobId/assign",
  authenticate,
  authorize("homeowner"),
  assignJobTechnician,
);
router.get(
  "/:jobId/availability",
  authenticate,
  authorize("homeowner", "technician"),
  getJobTimeSlotAvailability,
);
router.patch(
  "/:jobId/schedule",
  authenticate,
  authorize("homeowner", "technician"),
  scheduleAssignedJob,
);
router.patch(
  "/:jobId/cancel",
  authenticate,
  authorize("homeowner"),
  cancelAndReopenAssignedJob,
);
router.patch(
  "/:jobId/complete",
  authenticate,
  authorize("homeowner", "technician"),
  markAssignedJobComplete,
);
router.post(
  "/:jobId/ratings",
  authenticate,
  authorize("homeowner", "technician"),
  rateCompletedJob,
);
router.get("/:jobId", authenticate, authorize("admin", "homeowner", "technician"), getJob);
router.post("/", authenticate, authorize("homeowner"), postJob);
router.patch("/:jobId", authenticate, authorize("homeowner"), updateOpenJob);
router.delete("/:jobId", authenticate, authorize("homeowner"), deleteOpenJob);

export default router;

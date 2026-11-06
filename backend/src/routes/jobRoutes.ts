import { Router } from "express";
import mongoose from "mongoose";
import { listOpenJobs, postJob, updateOpenJob, deleteOpenJob } from "../controllers/jobController";
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

router.get("/", authenticate, authorize("technician"), listOpenJobs);
router.post("/", authenticate, authorize("homeowner"), postJob);
router.patch("/:jobId", authenticate, authorize("homeowner"), updateOpenJob);
router.delete("/:jobId", authenticate, authorize("homeowner"), deleteOpenJob);

export default router;

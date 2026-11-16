import { Router } from "express";
import mongoose from "mongoose";
import {
  changeServiceActiveStatus,
  getServices,
  postService,
  removeService,
} from "../controllers/serviceController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();

router.get("/", authenticate, getServices);
router.post("/", authenticate, authorize("admin"), postService);
router.patch(
  "/:serviceId/status",
  authenticate,
  authorize("admin"),
  changeServiceActiveStatus,
);
router.delete(
  "/:serviceId",
  authenticate,
  authorize("admin"),
  removeService,
);

router.param("serviceId", (_req, res, next, serviceId) => {
  if (!mongoose.isObjectIdOrHexString(serviceId)) {
    res.status(400).json({ message: "Invalid service ID" });
    return;
  }

  next();
});

export default router;

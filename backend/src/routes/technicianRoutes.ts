import { Router } from "express";
import {
  deactivateMyTechnicianProfile,
  getMyTechnicianProfile,
  listTechnicians,
  putMyTechnicianProfile,
} from "../controllers/technicianProfileController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();

router.get("/", authenticate, authorize("homeowner"), listTechnicians);
router.get(
  "/me/profile",
  authenticate,
  authorize("homeowner", "technician"),
  getMyTechnicianProfile,
);
router.put(
  "/me/profile",
  authenticate,
  authorize("homeowner", "technician"),
  putMyTechnicianProfile,
);
router.delete(
  "/me/profile",
  authenticate,
  authorize("homeowner", "technician"),
  deactivateMyTechnicianProfile,
);

export default router;

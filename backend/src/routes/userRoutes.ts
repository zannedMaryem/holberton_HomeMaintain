import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  updateProfile,
  updatePassword,
  updateEmail,
  deleteAccount,
  getMyRatingSummary,
} from "../controllers/userController";

const router = Router();

router.get("/me/ratings", authenticate, getMyRatingSummary);

router.patch("/me", authenticate, updateProfile);

router.patch("/me/email", authenticate, updateEmail);

router.patch("/me/password", authenticate, updatePassword);

router.delete("/me", authenticate, deleteAccount);

export default router;

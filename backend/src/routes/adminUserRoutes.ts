import { Router } from "express";
import mongoose from "mongoose";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/adminUserController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();

/*
 * Every route in this router requires:
 * 1. A valid JWT
 * 2. The admin role
 */
router.use(authenticate);
router.use(authorize("admin"));

router.param("id", (_req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ message: "Invalid user ID" });
    return;
  }

  next();
});

router.get("/", getUsers);

router.get("/:id", getUser);

router.patch("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;

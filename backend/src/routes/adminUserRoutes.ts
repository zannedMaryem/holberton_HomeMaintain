import { Router } from "express";
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

router.get("/", getUsers);

router.get("/:id", getUser);

router.patch("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;

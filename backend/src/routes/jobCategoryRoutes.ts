import { Router } from "express";
import mongoose from "mongoose";
import {
  getJobCategories,
  postCategory,
  changeCategoryStatus,
  deleteCategory,
} from "../controllers/jobCategoryController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();

router.get("/", authenticate, getJobCategories);
router.post("/", authenticate, authorize("admin"), postCategory);
router.patch(
  "/:categoryId/status",
  authenticate,
  authorize("admin"),
  changeCategoryStatus,
);
router.delete("/:categoryId", authenticate, authorize("admin"), deleteCategory);

router.param("categoryId", (_req, res, next, categoryId) => {
  if (!mongoose.isObjectIdOrHexString(categoryId)) {
    res.status(400).json({ message: "Invalid category ID" });
    return;
  }

  next();
});

export default router;

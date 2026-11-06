import { Router } from "express";
import { getJobCategories } from "../controllers/jobCategoryController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, getJobCategories);

export default router;

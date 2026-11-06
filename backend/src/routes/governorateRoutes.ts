import { Router } from "express";
import { listGovernorates } from "../controllers/governorateController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, listGovernorates);

export default router;

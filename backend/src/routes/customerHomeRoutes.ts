import { Router } from "express";
import { getHomeContent, checkServiceArea, getGlobalSearch } from "../modules/customer/controllers/customerHomeController";

const router = Router();

// Public routes
router.get("/", getHomeContent);
router.get("/search", getGlobalSearch);
router.get("/check-service-area", checkServiceArea);

export default router;

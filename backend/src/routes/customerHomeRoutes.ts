import { Router } from "express";
import { getHomeContent, getStoreProducts, checkServiceArea, getGlobalSearch } from "../modules/customer/controllers/customerHomeController";

const router = Router();

// Public routes
router.get("/", getHomeContent);
router.get("/search", getGlobalSearch);
router.get("/check-service-area", checkServiceArea);
router.get("/store/:storeId", getStoreProducts);

export default router;

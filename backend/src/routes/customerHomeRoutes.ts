import { Router } from "express";
import { getHomeContent, checkServiceArea, getGlobalSearch } from "../modules/customer/controllers/customerHomeController";
import * as faqController from "../modules/admin/controllers/adminFAQController";
import * as settingsController from "../modules/admin/controllers/adminSettingsController";


const router = Router();

// Public routes
router.get("/", getHomeContent);
router.get("/faqs", faqController.getFAQs);
router.get("/settings", settingsController.getPublicAppSettings);
router.get("/search", getGlobalSearch);

router.get("/check-service-area", checkServiceArea);

export default router;

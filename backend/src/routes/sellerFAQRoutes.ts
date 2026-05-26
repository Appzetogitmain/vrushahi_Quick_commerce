import { Router } from "express";
import * as faqController from "../modules/admin/controllers/adminFAQController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(requireUserType('Seller'));

// Seller gets FAQs (internally faqController should support fetching only those matching role="Seller" or "All")
router.get("/", faqController.getFAQs);

export default router;

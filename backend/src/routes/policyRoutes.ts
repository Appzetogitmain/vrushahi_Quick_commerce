import { Router } from "express";
import * as policyController from "../modules/admin/controllers/adminPolicyController";

const router = Router();

// Public route to get policies by type
// Usage: /api/v1/policies?type=delivery&isActive=true
router.get("/", policyController.getPolicies);

export default router;

import express from "express";
import {
  getQuestionnaires,
  updateQuestionnaire,
} from "../controllers/questionnaire.controller.js";
import authMiddleware, { authorizeRoles } from "../middlewares/authMiddleware.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";
import { cacheKeys } from "../utils/cacheKeys.js";

const router = express.Router();

// Get all questionnaires for the logged-in vendor (cached)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("VENDOR"),
  cacheMiddleware((req) => cacheKeys.vendorQuestionnaire(req.user.id)),
  getQuestionnaires
);

// Get own questionnaires (alias route)
router.get("/me", authMiddleware, authorizeRoles("VENDOR"), getQuestionnaires);

// Update a single questionnaire answer
router.put("/:id", authMiddleware, authorizeRoles("VENDOR"), updateQuestionnaire);

export default router;

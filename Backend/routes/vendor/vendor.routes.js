import express from "express";
import {
  submitQuestionnaire,
  getQuestionnaires,
  updateQuestionnaire,
  deleteQuestionnaire,
} from "../../controllers/questionnaire.controller.js";
import { getLoggedInVendorDetails } from "../../controllers/user.controller.js";
import prisma from "../../prisma/client.js";
import upload from "../../middlewares/uploadMiddleware.js";
import authMiddleware, { authorizeRoles } from "../../middlewares/authMiddleware.js";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware.js";
import { cacheKeys } from "../../utils/cacheKeys.js";

const router = express.Router();
router.post(
  "/questionnaire",
  authMiddleware,
  authorizeRoles("VENDOR"),
  upload.single("file"),
  submitQuestionnaire
);

router.get(
  "/questionnaire",
  authMiddleware,
  authorizeRoles("VENDOR"),
  cacheMiddleware((req) => cacheKeys.vendorQuestionnaire(req.user.id)),
  async (req, res) => {
    try {
      const vendorId = req.user.id;
      const questionnaires = await prisma.questionnaire.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({
        message: "Questionnaires fetched successfully.",
        data: questionnaires.map((q) => ({
          id: q.id,
          createdAt: q.createdAt,
          questionKey: q.questionKey,
          answerType: q.answerType,
          fileUrl: q.fileUrl,
          comment: q.comment,
        })),
      });
    } catch (err) {
      console.error("Error fetching questionnaires:", err);
      res.status(500).json({ error: "Failed to fetch questionnaires." });
    }
  }
);

// Update existing questionnaire answer
router.patch(
  "/questionnaire/:id",
  authMiddleware,
  authorizeRoles("VENDOR"),
  updateQuestionnaire
);

// Delete questionnaire answer
router.delete(
  "/questionnaire/:id",
  authMiddleware,
  authorizeRoles("VENDOR"),
  deleteQuestionnaire
);

// Vendor's own details (no cache needed)
router.get("/details", authMiddleware, authorizeRoles("VENDOR"), getLoggedInVendorDetails);

// Vendor summary (cached)
router.get(
  "/vendor-summary",
  authMiddleware,
  authorizeRoles("VENDOR"),
  cacheMiddleware((req) => cacheKeys.vendorSummaryForVendor(req.user.id)),
  async (req, res) => {
    const vendorId = req.user.id;

    try {
      const vendor = await prisma.user.findFirst({
        where: { id: vendorId, role: "VENDOR" },
        include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (vendor.verificationStatus !== "APPROVED")
        return res.status(403).json({ error: "Vendor not verified" });

      res.status(200).json({
        message: "Latest summary fetched for logged-in vendor.",
        data: vendor.summaries[0]
          ? {
              id: vendor.summaries[0].id,
              createdAt: vendor.summaries[0].createdAt,
              parsedContent: vendor.summaries[0].parsedContent,
            }
          : null,
      });
    } catch (err) {
      console.error("Error fetching vendor summary:", err);
      res.status(500).json({ error: "Server error while fetching summary." });
    }
  }
);

// Set client for vendor (update)
router.patch(
  "/set-client",
  authMiddleware,
  authorizeRoles("VENDOR"),
  async (req, res) => {
    const userId = req.user.id;
    const { clientId } = req.body;

    if (!clientId) return res.status(400).json({ error: "Client ID is required" });

    try {
      const client = await prisma.user.findUnique({ where: { id: clientId } });
      if (!client || client.role !== "CLIENT" || client.verificationStatus !== "APPROVED") {
        return res.status(400).json({ error: "Invalid client" });
      }

      const updatedVendor = await prisma.user.update({
        where: { id: userId },
        data: { clientId },
        select: { id: true, name: true, clientId: true },
      });

      res.json({ message: "Client assigned successfully", vendor: updatedVendor });
    } catch (err) {
      console.error("Error setting client:", err);
      res.status(500).json({ error: "Failed to set client" });
    }
  }
);

export default router;

import express from "express";
import prisma from "../prisma/client.js";
import authMiddleware, { authorizeRoles } from "../middlewares/authMiddleware.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";
import { cacheKeys } from "../utils/cacheKeys.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Helper to generate signed S3 URLs
async function getSignedUrlForS3Key(key) {
  return awsGetSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }),
    { expiresIn: 3600 } // 1 hour
  );
}

/**
 * Get questionnaire status for a vendor (used by all roles)
 */
router.get(
  "/questionnaire-status",
  authMiddleware,
  authorizeRoles("COMPANY", "CLIENT", "VENDOR"),
  cacheMiddleware((req) => {
    const vendorId = req.user.role === "VENDOR" ? req.user.id : req.query.vendorId;
    return cacheKeys.clientQuestionnaireStatus(vendorId);
  }),
  async (req, res) => {
    try {
      const vendorId = req.user.role === "VENDOR" ? req.user.id : req.query.vendorId;
      // You already have getQuestionnaireStats controller
      const data = await getQuestionnaireStats(req, vendorId);
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch questionnaire status." });
    }
  }
);

/**
 * Get vendor answers (cached)
 */
router.get(
  "/vendor/:vendorId/answers",
  authMiddleware,
  authorizeRoles("COMPANY", "CLIENT", "VENDOR"),
  cacheMiddleware((req) => {
    const vendorId = req.params.vendorId;
    return req.user.role === "VENDOR"
      ? cacheKeys.vendorQuestionnaire(vendorId)
      : cacheKeys.clientQuestionnaireStatus(vendorId);
  }),
  async (req, res) => {
    try {
      const { vendorId } = req.params;

      const vendor = await prisma.user.findUnique({ where: { id: vendorId } });
      if (!vendor || vendor.role !== "VENDOR") return res.status(404).json({ error: "Vendor not found" });

      if (req.user.role === "CLIENT" && vendor.clientId !== req.user.id)
        return res.status(403).json({ error: "Access denied" });

      if (req.user.role === "VENDOR" && vendorId !== req.user.id)
        return res.status(403).json({ error: "Access denied" });

      const answersRaw = await prisma.questionnaire.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        select: { id: true, questionKey: true, answerType: true, fileUrl: true, comment: true, createdAt: true },
      });

      const answers = await Promise.all(
        answersRaw.map(async (a) => {
          if (!a.fileUrl) return a;
          try {
            return { ...a, fileUrl: await getSignedUrlForS3Key(a.fileUrl) };
          } catch {
            return { ...a, fileUrl: null };
          }
        })
      );

      res.json({ success: true, vendor: { id: vendor.id, name: vendor.name }, answers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch vendor answers." });
    }
  }
);

/**
 * Get vendor summary (cached)
 */
router.get(
  "/vendor-summary/:vendorId",
  authMiddleware,
  authorizeRoles("COMPANY", "CLIENT"),
  cacheMiddleware((req) => cacheKeys.vendorSummary(req.params.vendorId, req.user?.id)),
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;

      let vendor;
      if (userRole === "CLIENT") {
        vendor = await prisma.user.findFirst({
          where: { id: vendorId, clientId: userId, role: "VENDOR" },
          include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
      } else {
        vendor = await prisma.user.findFirst({
          where: { id: vendorId, role: "VENDOR" },
          include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
      }

      if (!vendor) return res.status(404).json({ error: "Vendor not found or not accessible." });
      if (vendor.verificationStatus !== "APPROVED") return res.status(403).json({ error: "Vendor not verified." });

      res.json({
        message: "Latest vendor summary fetched.",
        data: vendor.summaries[0]
          ? { id: vendor.summaries[0].id, createdAt: vendor.summaries[0].createdAt, content: vendor.summaries[0].parsedContent }
          : null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch vendor summary." });
    }
  }
);

/**
 * Get all approved clients (cached)
 */
router.get(
  "/clients",
  authMiddleware,
  cacheMiddleware(() => cacheKeys.allClients()),
  async (req, res) => {
    try {
      const clients = await prisma.user.findMany({
        where: { role: "CLIENT", verificationStatus: "APPROVED" },
        select: { id: true, name: true, email: true },
      });
      res.json({ success: true, data: clients });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch clients." });
    }
  }
);

export default router;

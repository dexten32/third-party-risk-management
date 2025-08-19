import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import roleCheck from "../../middlewares/roleCheck.js";
import prisma from "../../prisma/client.js";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware.js";
import { cacheKeys } from "../../utils/cacheKeys.js";

const REQUIRED_QUESTION_COUNT = 5;
const router = express.Router();

// ✅ Welcome route
router.get("/dashboard", authMiddleware, roleCheck("CLIENT"), (req, res) => {
  res.json({
    success: true,
    data: { welcome: `Welcome Client ${req.user.name}` },
  });
});

// ✅ Dashboard stats for client
router.get(
  "/dashboard/stats",
  authMiddleware,
  roleCheck("CLIENT"),
  cacheMiddleware((req) => cacheKeys.clientDashboardStats(req.user.id)),
  async (req, res) => {
    try {
      const clientId = req.user.id;

      const vendors = await prisma.user.findMany({
        where: { role: "VENDOR", clientId },
        select: { id: true },
      });

      const vendorIds = vendors.map((v) => v.id);

      if (vendorIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            totalVendors: 0,
            completedQuestionnaires: 0,
            summariesUploaded: 0,
          },
        });
      }

      const [questionnaireCounts, summaries] = await Promise.all([
        prisma.questionnaire.groupBy({
          by: ["vendorId"],
          where: { vendorId: { in: vendorIds } },
          _count: true,
        }),
        prisma.summary.findMany({
          where: { vendorId: { in: vendorIds } },
          select: { vendorId: true },
          distinct: ["vendorId"],
        }),
      ]);

      const completedQuestionnaires = questionnaireCounts.filter(
        (q) => q._count >= REQUIRED_QUESTION_COUNT
      ).length;

      res.status(200).json({
        success: true,
        data: {
          totalVendors: vendorIds.length,
          completedQuestionnaires,
          summariesUploaded: summaries.length,
        },
      });
    } catch (err) {
      console.error("Error fetching client dashboard stats:", err.message);
      res.status(500).json({
        success: false,
        error: "Server error while fetching stats.",
      });
    }
  }
);

// ✅ Vendors under this client
router.get(
  "/vendors",
  authMiddleware,
  roleCheck("CLIENT"),
  cacheMiddleware((req) => cacheKeys.clientVendorsList(req.user.id)),
  async (req, res) => {
    try {
      const clientId = req.user.id;
      const { name, email } = req.query;

      const filters = {
        role: "VENDOR",
        clientId,
      };

      if (name) filters.name = { contains: name, mode: "insensitive" };
      if (email) filters.email = { contains: email, mode: "insensitive" };

      const vendors = await prisma.user.findMany({
        where: filters,
        select: {
          id: true,
          name: true,
          email: true,
          summaries: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, createdAt: true },
          },
        },
      });

      const formatted = vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        latestSummary: vendor.summaries[0] || null,
      }));

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      console.error("Error fetching vendors:", err.message);
      res.status(500).json({
        success: false,
        error: "Server error while fetching vendors.",
      });
    }
  }
);

// ✅ Summaries of vendors under this client
router.get(
  "/summary",
  authMiddleware,
  roleCheck("CLIENT"),
  cacheMiddleware((req) => cacheKeys.clientSummaries(req.user.id)),
  async (req, res) => {
    try {
      const clientId = req.user.id;

      const vendors = await prisma.user.findMany({
        where: { clientId, role: "VENDOR" },
        select: { id: true },
      });

      const vendorIds = vendors.map((v) => v.id);

      const summaries = await prisma.summary.findMany({
        where: { vendorId: { in: vendorIds } },
        select: {
          id: true,
          vendorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ success: true, data: summaries });
    } catch (err) {
      console.error("Error fetching client summaries:", err.message);
      res.status(500).json({
        success: false,
        error: "Server error while fetching summaries.",
      });
    }
  }
);


router.get(
  "/client-vendors",
  authMiddleware,
  roleCheck("CLIENT"),
  cacheMiddleware((req) => cacheKeys.clientVendors(req.user.id)),
  async (req, res) => {
    try {
      const clientId = req.user.id;

      const vendors = await prisma.user.findMany({
        where: {
          role: "VENDOR",
          clientId,
          verificationStatus: "APPROVED",
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          questionnaireStatus: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Vendors for the logged-in client fetched successfully.",
        data: vendors,
      });
    } catch (err) {
      console.error("Error fetching client's vendors:", err);
      res.status(500).json({ error: "Server error while fetching vendors." });
    }
  }
);

export default router;

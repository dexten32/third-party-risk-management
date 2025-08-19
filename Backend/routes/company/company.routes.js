import express from "express";
import authMiddleware, { authorizeRoles } from "../../middlewares/authMiddleware.js";
import prisma from "../../prisma/client.js";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware.js";
import { cacheKeys } from "../../utils/cacheKeys.js";
import { getVendorDetailsById, uploadSummary, deleteUser } from "../../controllers/user.controller.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

router.get(
  "/users",
  authMiddleware,
  authorizeRoles("COMPANY"),
  cacheMiddleware(() => cacheKeys.allUsers()),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { role: { in: ["CLIENT", "VENDOR", "COMPANY"] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          verificationStatus: true,
          clientId: true,
        },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ data: users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Server error while fetching users." });
    }
  }
);

router.patch(
  "/approve/:userId",
  authMiddleware,
  authorizeRoles("COMPANY"),
  cacheMiddleware(() => cacheKeys.allUsers()),
  async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body; 

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ error: "Action must be APPROVE or REJECT" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || !["CLIENT", "VENDOR", "COMPANY"].includes(user.role)) {
        return res.status(404).json({ error: "User not found or not approvable" });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
        },
      });

      res.status(200).json({
        message: `User ${action === "APPROVE" ? "approved" : "rejected"} successfully.`,
        data: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          verificationStatus: updated.verificationStatus,
        },
      });
    } catch (err) {
      console.error("Error updating user verification:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


router.get(
  "/vendors-by-client",
  authMiddleware,
  authorizeRoles("COMPANY"),
  cacheMiddleware(() => cacheKeys.allVendors()),
  async (req, res) => {
    try {
      const clients = await prisma.user.findMany({
        where: { role: "CLIENT", verificationStatus: "APPROVED" },
        select: { id: true, name: true },
      });

      const results = await Promise.all(
        clients.map(async (client) => {
          const vendors = await prisma.user.findMany({
            where: {
              role: "VENDOR",
              clientId: client.id,
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

          return {
            clientId: client.id,
            clientName: client.name,
            vendors,
          };
        })
      );

      res.status(200).json({
        message: "Vendors grouped by client fetched successfully.",
        data: results,
      });
    } catch (err) {
      console.error("Error fetching vendors by client:", err);
      res.status(500).json({ error: "Server error while fetching vendors." });
    }
  }
);


router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("COMPANY"),
  cacheMiddleware(() => cacheKeys.companyDashboardStats()),
  async (req, res) => {
    try {
      const [verifiedClients, verifiedVendors, pendingUsers, totalSummaries] =
        await Promise.all([
          prisma.user.count({ where: { role: "CLIENT", verificationStatus: "APPROVED" } }),
          prisma.user.count({ where: { role: "VENDOR", verificationStatus: "APPROVED" } }),
          prisma.user.count({
            where: {
              role: { in: ["CLIENT", "VENDOR"] },
              verificationStatus: "PENDING",
            },
          }),
          prisma.summary.count(),
        ]);

      res.status(200).json({
        message: "Company dashboard stats fetched.",
        success: true,
        data: { verifiedClients, verifiedVendors, pendingUsers, totalSummaries },
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      res.status(500).json({ error: "Server error while fetching stats." });
    }
  }
);

router.get("/vendor/:vendorId", getVendorDetailsById);


router.post("/summary/upload", authMiddleware, authorizeRoles("COMPANY"), uploadSummary);


router.delete("/delete-user/:userId", authMiddleware, authorizeRoles("COMPANY"), deleteUser);


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

router.get("/file-url/:fileKey", async (req, res) => {
  try {
    const { fileKey } = req.params;
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ url: signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate file URL" });
  }
});

export default router;

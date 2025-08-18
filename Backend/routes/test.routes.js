import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleCheck from "../middlewares/roleCheck.js";
import prisma from "../prisma/client.js";

const router = express.Router();

// Accessible only by VENDORs
router.get(
  "/vendor-only",
  authMiddleware,
  roleCheck("VENDOR"),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    res.status(200).json({ message: `Welcome Vendor ${user.name}!` });
  }
);

router.get("/client", authMiddleware, roleCheck("CLIENT"), (req, res) => {
  res.status(200).json({ message: `Welcome Client ${req.user.name}!` });
});
export default router;

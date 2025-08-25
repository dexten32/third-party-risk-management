import { VerificationStatus } from "@prisma/client";
import prisma from "../prisma/client.js";
import bcrypt from "bcryptjs";
import { jwtDecode } from "jwt-decode";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const { name, email, password, role, clientId } = req.body;

  try {
    // if (role === "COMPANY" && (!req.user || req.user.role !== "COMPANY")) {
    //   return res.status(403).json({ error: "Only admins can create another admin" });
    // }

    if (!req.user) {
      
      if (role !== "CLIENT" && role !== "VENDOR") {
        return res.status(403).json({ error: "Invalid role for public signup" });
      }
    }
    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        clientId: role === "VENDOR" ? clientId : undefined,
      },
    });

    return res.status(201).json({
      message: "User created",
      data: { id: user.id, role: user.role },
    });
  } catch (err) {
    console.error("[Signup Error]", err);
    return res.status(500).json({ error: "Signup failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // 1 week expiry
    );
    const decode = jwtDecode(token);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        VerificationStatus: user.VerificationStatus,
      },
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

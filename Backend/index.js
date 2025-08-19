import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { S3Client } from "@aws-sdk/client-s3";
import cookieParser from 'cookie-parser';
import authRoutes from "./routes/auth.routes.js";
import sharedRoutes from "./routes/shared.routes.js";
import questionnaireRoutes from "./routes/questionnaire.routes.js";
import testRoutes from "./routes/test.routes.js";
import vendorRoutes from "./routes/vendor/vendor.routes.js";
import clientRoutes from "./routes/client/client.routes.js";
import companyRoutes from "./routes/company/company.routes.js";
import { loadCacheMeta } from "./utils/cacheManager.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Middlewares
app.use(cors({origin: process.env.VITE_PUBLIC_API_URL,
  credentials: true,}));
app.use(express.json());
app.use(helmet());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
app.use("/api/questionnaires", questionnaireRoutes);

// Vendor routes
app.use("/api/vendor", vendorRoutes);

// Client routes
app.use("/api/client", clientRoutes);

// Company routes
app.use("/api/company", companyRoutes);

// Shared routes  
app.use("/api/shared", sharedRoutes);



// Static file serving for uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.static(path.join(__dirname, "../frontend/dist")));

// React Router fallback → always return index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});



// Load cache meta on server start
await loadCacheMeta();

// Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

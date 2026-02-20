import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import passport from "passport";
import "./app/config/passport.config.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandeler.js";
import { notFound } from "./app/middleware/notFound.js";
import { router } from "./app/router/index.js";



dotenv.config();

const app = express();

// Global middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use("/api", router);
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/", (req, res) => {
  res.send("Dealafriq Backend is running!");
});

// 404 handler (must be after routes)
app.use(notFound);

// Global error handler (always last)
app.use(globalErrorHandler);

export default app;



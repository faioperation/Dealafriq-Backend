import app from "./app.js";
import { envVars } from "./app/config/env.js";
import { connectRedis } from "./app/config/redis.config.js";
import prisma from "./app/prisma/client.js";
import { initEmailSyncCron } from "./app/cron/emailSyncCron.js";

let server;

const PORT = envVars.PORT || 8001;

const startServer = async () => {
  try {
    console.log(`Environment: ${envVars.NODE_ENV}`);

    // Connect Redis
    await connectRedis();
    console.log("Redis Connected Successfully 🚚✅");

    // Start server
    server = app.listen(PORT, () => {
      console.log(`Server running on port 🛺✅ ${PORT}`);
    });

    // Initialize Cron Jobs
    initEmailSyncCron();
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start server
startServer();

/**
 * 🔴 Unhandled Promise Rejection
 */
process.on("unhandledRejection", async (err) => {
  console.error(
    "Unhandled Rejection Detected... server shutting down...",
    err
  );

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(1);
    });
  } else {
    await prisma.$disconnect();
    process.exit(1);
  }
});

/**
 * 🔴 Uncaught Exception
 */
process.on("uncaughtException", async (err) => {
  console.error(
    "Uncaught Exception Detected... server shutting down...",
    err
  );

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(1);
    });
  } else {
    await prisma.$disconnect();
    process.exit(1);
  }
});

/**
 * 🟡 SIGTERM (Docker / Kubernetes)
 */
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
});

/**
 * 🟡 SIGINT (Ctrl + C)
 */
process.on("SIGINT", async () => {
  console.log("SIGINT signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
});

import dotenv from "dotenv";
dotenv.config();

const loadEnvVars = () => {
  const requiredVars = [
    "PORT",
    "NODE_ENV",

    "JWT_SECRET_TOKEN",
    "JWT_REFRESH_TOKEN",
    "JWT_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",

    "DATABASE_URL",

    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_USERNAME",
    "REDIS_PASSWORD",
    "REDIS_URL",

    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",

    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",

    "GOOGLE_CLIENT_ID_EMAIL",
    "GOOGLE_CLIENT_SECRET_EMAIL",
    "GOOGLE_CALLBACK_URL_EMAIL",

    "FRONT_END_URL",

    "ZOOM_CLIENT_SECRET",
    "OUTLOOK_CLIENT_ID",
    "OUTLOOK_CLIENT_SECRET",
    "OUTLOOK_TENANT_ID",
    "OUTLOOK_CALLBACK_URL",
  ];

  requiredVars.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`❌ Missing environment variable: ${key}`);
    }
  });

  return {
    // App
    PORT: Number(process.env.PORT),
    NODE_ENV: process.env.NODE_ENV,

    // JWT
    JWT_SECRET_TOKEN: process.env.JWT_SECRET_TOKEN,
    JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    // Redis
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT),
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_URL: process.env.REDIS_URL,
    // node mailer (SMTP)
    EMAIL_SENDER: {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: Number(process.env.SMTP_PORT),
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
    },
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

    // Google OAuth for Email Integration
    GOOGLE_CLIENT_ID_EMAIL: process.env.GOOGLE_CLIENT_ID_EMAIL,
    GOOGLE_CLIENT_SECRET_EMAIL: process.env.GOOGLE_CLIENT_SECRET_EMAIL,
    GOOGLE_CALLBACK_URL_EMAIL: process.env.GOOGLE_CALLBACK_URL_EMAIL,
    // Frontend
    FRONT_END_URL: process.env.FRONT_END_URL,

    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,

    // Outlook
    OUTLOOK_CLIENT_ID: process.env.OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET: process.env.OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID: process.env.OUTLOOK_TENANT_ID,
    OUTLOOK_CALLBACK_URL: process.env.OUTLOOK_CALLBACK_URL,
  };
};

export const envVars = loadEnvVars();

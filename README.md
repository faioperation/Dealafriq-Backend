# Startup Template PostgreSQL Backend

This is a robust startup template for a backend application using Node.js, Express, PostgreSQL, and Prisma. It includes essential features like authentication (OAuth & Email), OTP verification, and user management.

## 🚀 Features

- **Authentication**: Secure login/registration using `bcrypt` and `jsonwebtoken`.
- **OAuth Integration**: Google Login support via `passport-google-oauth20`.
- **OTP System**: Send and verify OTPs for email verification and password resets.
- **User Management**: Profile management, user roles (System Owner, Business Owner, Admin, Project Manager), and details retrieval.
- **Validation**: Request body and parameter validation using `Zod`.
- **Database Architecture**: Managed by Prisma ORM with PostgreSQL.
- **Error Handling**: Centralized error management system.
- **Mailing**: Integration with `nodemailer` for automated emails with modern, responsive EJS templates.
- **File Upload System**: Reusable Multer configuration supporting multiple categories (e.g., avatars) with automatic path handling and unique naming.
- **Static Assets**: Dedicated structure for serving uploaded files (e.g., user avatars) statically.
- **Security**: CORS, cookie-parser, and middleware-based authorization.

## 📦 Tech Stack & Packages

### Core

- **Framework**: `express`
- **ORM**: `prisma`
- **Database**: `postgresql` (via `pg`)
- **Runtime**: Node.js (ES Modules)

### Main Dependencies

- **Auth**: `passport`, `passport-google-oauth20`, `passport-local`, `jsonwebtoken`, `bcrypt`
- **Security**: `cors`, `cookie-parser`, `zod` (validation)
- **Utilities**: `axios`, `date-fns`, `dotenv`, `multer` (file uploads), `nodemailer`
- **Cache**: `redis`

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd StartupTemplatePostgreSql
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your configurations (Database URL, JWT secret, OAuth credentials, etc.).

4. **Prisma Setup**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the application**:
   - Development: `npm run dev`
   - Production: `npm start`

## 🛣️ API Routes & CRUD

### BASE URL > http://localhost:8000/api/

### Auth Module (`/api/auth`)

| Method | Route                              | Description                            |
| :----- | :--------------------------------- | :------------------------------------- | ---------------------------------- |
| POST   | `/auth/login`                      | User login with credentials            |
| POST   | `/auth/refresh-token`              | Get a new access token                 |
| POST   | `/auth/logout`                     | Log out user and clear session         |
| POST   | `/auth/forgot-password`            | Initiate forgot password flow          |
| POST   | `/auth/verify-forgot-password-otp` | Verify OTP for password reset          |
| POST   | `/auth/reset-password`             | Reset user password (Auth required)    |
| POST   | `/auth/change-password`            | Change user password (Auth required)   | OldPassword - NewPassword Required |
| GET    | `/auth/google`                     | Initiate Google OAuth login            |
| GET    | `/auth/google/url`                 | Get the Google OAuth authorization URL |
| GET    | `/auth/google/callback`            | Google OAuth callback URL              |

### User Module (`/api/user`)

| Method | Route                    | Description                                           |
| :----- | :----------------------- | :---------------------------------------------------- |
| POST   | `/user/register`         | Register a new user (Supports optional avatar upload) |
| GET    | `/user/profile/me`       | Get current logged-in user profile                    |
| GET    | `/user/user-details/:id` | Get specific user details by ID                       |
| GET    | `/user/all`              | Get all users with profiles                           |
| POST   | `/user/update-user`      | Update user information (Admin only)                  |
| PATCH  | `/user/update-profile`   | Update current user profile (Auth required)           |
| PATCH  | `/user/upload-avatar`    | Upload or update user avatar (Auth required)          |

### OTP Module (`/api/otp`)

| Method | Route         | Description            |
| :----- | :------------ | :--------------------- |
| POST   | `/otp/send`   | Send OTP to user email |
| POST   | `/otp/verify` | Verify the sent OTP    |

---

## Postman Collection > [POSTMAN]StratupTemplate.postman.json

_Created with ❤️ for rapid development._ ©️ Ahanaf Mubasshir

# Google Calendar Integration Module

This module enables Project Managers to synchronize, view, and manage their Google Calendar events within the Dealafriq Backend system.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Architecture](#database-architecture)
4. [API Endpoints](#api-endpoints)
5. [How It Works](#how-it-works)
    - [Authentication](#authentication)
    - [Synchronization](#synchronization)
6. [Usage Examples](#usage-examples)

---

## Overview

The Google Calendar module integrates with the user's primary Google Calendar account to fetch events (past and future), store them in our database for quick access, and allow association with specific projects.

## Prerequisites

- **Google Cloud Console Project**: Must have the "Google Calendar API" enabled.
- **Environment Variables**: The following must be configured in your `.env` file (reused from the Email module):
    - `GOOGLE_CLIENT_ID_EMAIL`
    - `GOOGLE_CLIENT_SECRET_EMAIL`
    - `GOOGLE_CALLBACK_URL_EMAIL`
- **Scopes**: The OAuth flow must include the `https://www.googleapis.com/auth/calendar.readonly` scope (already included in the default scopes for Google Email).

## Database Architecture

A new model `GoogleCalendarEvent` was added to the Prisma schema to persist synced events:

```prisma
model GoogleCalendarEvent {
  id            String    @id @default(uuid())
  googleEventId String    @unique @map("google_event_id")
  summary       String?
  description   String?
  location      String?
  start         DateTime
  end           DateTime
  htmlLink      String?   @map("html_link")
  userId        String    @map("user_id")
  projectId     String?   @map("project_id")
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  deleted_at    DateTime?
  // ... relations
}
```

## API Endpoints

All endpoints are prefixed with: `/api/v1/project-manager/google-calendar`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/sync` | Syncs up to 50 events from Google Calendar to the local database. |
| `GET` | `/events` | Retrieves synced events. Supports `?projectId=...` filtering. |
| `DELETE` | `/events/:id` | Soft deletes a synced event record from the local database. |

## How It Works

### Authentication
The module reuses the **Google OAuth tokens** stored in the `EmailAccount` table. As long as a user has connected their Google Email account, the Calendar service can use those same `accessToken` and `refreshToken` to access their calendar.

### Synchronization (Manual & Automatic)
1. **Manual Sync**: Triggered via `POST /sync`. It fetches events from all visible calendars and allows associating them with a `projectId`.
2. **Automatic Background Sync**: A cron job runs every minute (defined in `src/app/cron/emailSyncCron.js`) that calls `syncAllConnectedCalendars()`. This ensures the local database is always up-to-date without user intervention.
3. **Smart Update**: Uses **Upsert** logic to ensure no duplicate events are created in the database.

### Automatic Event Creation
When a meeting is scheduled via the **Project Meeting Module** (`ProjectMeetingService.createMeeting`), the system automatically:
- Creates a corresponding event in the user's Primary Google Calendar.
- Saves the Google Event ID in our local database for linking.

### Filtering & Noise Reduction
To ensure users only see their **actual scheduled meetings**, the sync logic:
- **Excludes Holiday/Birthday Calendars**: Automatically ignores calendars with "holiday" or "birthday" in their title.
- **Filters by Status**: Skips any events marked as `cancelled`.
- **Multi-Calendar Support**: Fetches from the Primary calendar and any other calendars the user has explicitly `selected` or `owns`.

## Usage Examples
... (rest of the file)

### Syncing Events
```json
// POST /project-manager/google-calendar/sync
{
  "projectId": "7c8b9d0e-..." // Optional: associate new syncs with a project
}
```

### Fetching events for a Project
```http
GET /project-manager/google-calendar/events?projectId=7c8b9d0e-...
```

---

## Technical Maintenance
If a user is getting an error about missing scopes, they should disconnect and reconnect their Google account through the `/project-manager/email-account-connection` module to ensure the latest calendar scopes are granted.

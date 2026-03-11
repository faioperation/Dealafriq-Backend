# Zoom User-Level OAuth Integration

This document outlines the setup, architecture, and testing procedures for the multi-user Zoom OAuth integration. This replaces the old Server-to-Server (S2S) model, allowing individual users to connect their own Zoom accounts to the platform to sync meetings, recordings, and cloud transcripts.

---

## 1. Required Credentials (Environment Variables)

Your `dealafriq-backend/.env` file must include the following variables. These are obtained from your **Zoom App Marketplace** dashboard.

```env
# Multi-User Zoom OAuth Credentials
ZOOM_CLIENT_ID=rkdVfgDaRIy_pd140VcQGw
ZOOM_CLIENT_SECRET=BvNCTE7G2Ve462omhw8n5pK2aemv0dtm
ZOOM_REDIRECT_URI=http://localhost:8000/api/zoom/callback
```
*(Note: Change `ZOOM_REDIRECT_URI` to your production URL when deploying, e.g., `https://api.yourdomain.com/api/zoom/callback`)*

---

## 2. Zoom App Marketplace Configuration

To ensure this integration works, your app in the [Zoom App Marketplace](https://marketplace.zoom.us/) must be configured as follows:

1.  **App Type:** OAuth (User-managed app, not Server-to-Server).
2.  **Redirect URL for OAuth:** Add the Redirect URL in the **OAuth Information** section (e.g., `http://localhost:8000/api/zoom/callback`). Also, add the same URL to the **Add allow lists** section.

### Step 3: Configure Required Scopes
If you do not configure these scopes carefully, you will receive an "Invalid access token, does not contain scopes" generic 500 error when trying to fetch your meetings or recordings!

On the left sidebar of your Zoom App dashboard, navigate to **Scopes** and click **+ Add Scopes**. Add exactly the following:

- `meeting:read:meeting` (View a meeting)
- `meeting:read:list_meetings` (View a user's meetings)
- `meeting:write:meeting` (Modify a meeting) *(optional, for creating)*
- `recording:read` (View your cloud recordings - crucial for transcripts)
- `user:read:user` (View a user)

*Note: Any time you modify scopes in the Zoom Dashboard, users MUST re-connect their Zoom accounts via the `/authorize` endpoint to acquire tokens with the new permissions!*

4. **Feature / Webhook:** Enable Event Subscriptions.
   - Subscription Name: Meeting Ended
   - Event notification endpoint URL: `http://localhost:8000/api/zoom/webhook` (or production equivalent).
   - Events selected: `Meeting -> Meeting has ended`.

---

## 3. Database Updates

A `ZoomAccount` model exists in the Prisma Schema (`prisma/schema.prisma`) to store user-specific JSON web tokens securely:

```prisma
model ZoomAccount {
  id              String   @id @default(uuid())
  zoomUserId      String
  zoomEmail       String
  accessToken     String
  refreshToken    String
  tokenExpiry     DateTime
  connectedUserId String

  user User @relation(fields: [connectedUserId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("zoom_accounts")
}
```

---

## 4. How to Test the Flow

Because this involves **User-level OAuth**, testing requires a web browser where a user can actively log into their Zoom account and consent to the permissions.

### Step 1: Authorize (Connect Account)
Make a request (e.g., from your frontend application) or open your browser *if passing the token*.
The endpoint is protected by JWT authentication (`checkAuthMiddleware`), so it automatically extracts your `userId`.

```http
GET http://localhost:8000/api/zoom/authorize
Authorization: Bearer <YOUR_JWT_TOKEN>
```
*(If redirecting via a frontend link, ensure the frontend can pass the token, or handle the auth via cookies if applicable).*

### Step 2: Consent and Callback
- You will be redirected to Zoom's authorization page. 
- Click **Allow**.
- Zoom will redirect you back to: `http://localhost:8000/api/zoom/callback?code=...&state=<INTERNAL_USER_ID>`.
- The backend will exchange the code for an `access_token` and `refresh_token`, and save it in the `ZoomAccount` database linked to your `userId`.

### Step 3: Fetch API calls
Use Postman or curl to test retrieving meetings. Ensure you pass your JWT token in the headers.

**1. Fetch user's meetings:**
```http
GET http://localhost:8000/api/zoom/meetings
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**2. Fetch user's recordings (includes Cloud Transcripts):**
```http
GET http://localhost:8000/api/zoom/recordings
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**3. Create a new meeting:**
```http
POST http://localhost:8000/api/zoom/meetings
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json

{
  "topic": "Project Synchronization Meeting",
  "start_time": "2024-05-10T15:30:00Z"
}
```

If your token expires internally, the back-end seamlessly uses the `refresh_token` to get a new Zoom access token, updates the database, and processes the request without failing!

---

## 5. Core API Endpoints

All routes are prefixed with `/api/zoom`. Note: Most endpoints require a valid JWT token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/authorize` | Redirects user to the Zoom OAuth consent screen. (Requires Auth) |
| **GET** | `/callback` | Receives OAuth code from Zoom, fetches the user's Zoom Profile, and saves tokens in the DB. |
| **GET** | `/meetings` | Retrieves all scheduled meetings for the connected user. (Requires Auth) |
| **POST** | `/meetings` | Creates a new Zoom meeting on the connected user's account. Expects `topic`, and `start_time` in body. (Requires Auth) |
| **GET** | `/recordings` | Retrieves the User's cloud recordings. (Requires Auth) |
| **POST** | `/webhook` | Listens for `meeting.ended` events from Zoom to automatically download transcripts. |

---

## 6. How Transcript Downloading Works

When a meeting naturally ends on Zoom:
1. Zoom triggers a webhook to `POST /api/zoom/webhook` with the host's Zoom user ID.
2. The backend looks up the system `userId` tied to that Zoom Host ID in the `ZoomAccount` table.
3. The system gets a freshly validated access token for the user.
4. The system lists the recordings for the meeting and searches for `file_type: "TRANSCRIPT"` (or VTT extensions).
5. The transcript is downloaded into `./uploads/transcripts` using the user's bearer token.
6. The file is offloaded to your pre-existing `TranscriptService.uploadTranscriptService()` to persist into AI processing.

```javascript
// Excerpt from webhook handler
const downloadResponse = await axios({
    method: 'get',
    url: `${transcriptFile.download_url}?access_token=${token}`,
    responseType: 'stream'
});
// Stream piped and saved locally, then shipped to TranscriptService
```

# AyurSutra Backend (Auth)

Express + MongoDB backend providing signup/signin endpoints.

## Endpoints

- POST `/api/auth/signup`
  - body: `{ name, email, password }`
- POST `/api/auth/signin`
  - body: `{ email, password }`

Responses include a JWT `token` and sanitized `user` object.

## Setup

1. Copy `.env.example` to `.env` and fill values. If your MongoDB password contains special characters (like `@`), URL-encode it.
2. Install dependencies:
   - `npm install`
3. Run in dev:
   - `npm run dev`

Server starts on `http://localhost:5000` by default and connects to `MONGO_URI`.

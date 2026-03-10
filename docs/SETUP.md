# Maxro Setup Guide

## 1. Fix "Http failure response: 0 Unknown Error"

This usually means the **backend isn't running** or **MongoDB isn't running**.

### Quick start (Windows)
```powershell
# 1. Start MongoDB (requires Docker Desktop)
docker-compose up -d mongodb

# 2. Run both backend + frontend
.\start-dev.ps1
```
Opens two windows. Frontend: http://localhost:4200

### Manual start
```powershell
# MongoDB (required)
docker-compose up -d mongodb

# Backend
cd maxro-backend
.\mvnw.cmd spring-boot:run

# Frontend (new terminal)
cd maxro-frontend
npm install
npm start
```

---

## 2. Google Sign-In Setup

**No Client Secret needed.** Google Sign-In (GSI) only requires the **Client ID**. The frontend gets an ID token from Google's JS SDK, and the backend verifies it—no secret involved.

### Step 1: Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - User type: **External** (for testing) or **Internal** (for org only)
   - App name: **Maxro**
   - Add your email as test user if using External
6. For Application type, choose **Web application**
7. Add **Authorized JavaScript origins**:
   - `http://localhost:4200` (for dev)
   - `https://yourdomain.com` (for production)
8. Add **Authorized redirect URIs** (for OAuth redirect flow):
   - `http://localhost:4200/oauth2/callback`
   - `https://yourdomain.com/oauth2/callback`
9. Click **Create** and copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)

### Step 2: Configure the frontend

Edit `maxro-frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  graphqlUrl: 'http://localhost:8080/graphql',
  googleClientId: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
};
```

Edit `maxro-frontend/src/environments/environment.prod.ts` for production:

```typescript
googleClientId: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
```

### Step 3: Configure the backend

**Easiest:** Create a `.env` file in the project root (copy from `.env.example`):
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```
Then run `.\start-dev.ps1` — it loads `.env` and starts both backend and frontend.

**Or** set the env var manually when starting the backend:
```powershell
$env:GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"
cd maxro-backend; .\mvnw.cmd spring-boot:run
```

### Step 4: Restart both frontend and backend

After adding the Client ID, restart the frontend (`npm start`) and backend so the changes take effect.

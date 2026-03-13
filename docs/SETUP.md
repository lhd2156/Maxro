# Maxro Setup Guide

## 1. Local startup

### Quick start on Windows

```powershell
Copy-Item .env.example .env
# Fill in JWT_SECRET and any optional integration values you want to use.
.\start-dev.ps1
```

### Manual start

```powershell
docker-compose up -d mongodb

cd maxro-backend
.\mvnw.cmd spring-boot:run

cd ..\maxro-frontend
npm install
npm start
```

## 2. Required local environment

At minimum, set this in your root `.env` file:

```dotenv
JWT_SECRET=replace-with-a-long-random-local-dev-secret
```

## 3. Google Sign-In setup

Google Sign-In only needs the client ID.

Add this to `.env`:

```dotenv
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

Authorized JavaScript origins should include:

- `http://localhost:4200`
- your production frontend URL

Maxro now loads the Google client ID from the backend through `/api/public-config`, so you do not need to edit `environment.ts`.

## 4. Spotify setup

Add these to `.env`:

```dotenv
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

The frontend loads the public Spotify client ID from the backend at startup. The secret stays backend-only.

## 5. Optional API integrations

```dotenv
USDA_FOODDATA_API_KEY=your-usda-key
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
GOOGLE_AI_API_KEY=your-gemini-key
GOOGLE_AI_MODEL=gemini-2.5-flash
```

## 6. Common issues

- `Google Sign-In is not configured yet`: missing `GOOGLE_CLIENT_ID` on the backend environment
- `Spotify Client ID is missing`: missing `SPOTIFY_CLIENT_ID` on the backend environment
- `Spotify integration is not configured`: missing backend `SPOTIFY_CLIENT_SECRET`
- `Http failure response: 0 Unknown Error`: backend or MongoDB is down

## 7. Java version

Use Java 21 for backend builds and Azure deployment parity.

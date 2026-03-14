# Maxro

Full-stack fitness tracking platform for logging workouts, tracking PRs, monitoring nutrition, managing water intake, and getting in-app fitness support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, TypeScript, Angular Material, ngx-charts |
| Backend | Spring Boot 3.5.11, Java 21 |
| API | GraphQL (Spring for GraphQL + Apollo Angular) plus a small REST config endpoint |
| Database | MongoDB |
| Food Data | USDA FoodData Central, FatSecret fallback support |
| Deployment | Azure Container Apps (backend), Azure Static Web Apps (frontend) |
| CI/CD | Azure DevOps Pipelines |
| Containers | Docker, Docker Compose |

## Features

- Workout logging with exercises, sets, reps, weight, and muscle groups
- Automatic PR tracking, including bodyweight PR support
- Workout streaks and dashboard summaries
- Nutrition logging with meal-level tracking, macros, and micros
- Water intake logging with quick add, custom add, and history
- Analytics for strength, calories, protein, and water consistency
- Spotify dashboard controls and saved-track actions
- In-app AI help for Maxro navigation and fitness questions

## Prerequisites

- Java 21
- Node.js 20+
- Docker Desktop if you want local MongoDB through Docker
- A `.env` file for local auth/API integrations

## Local Development

### Quick start on Windows

```powershell
Copy-Item .env.example .env
# Fill in at least JWT_SECRET. Add Google/Spotify IDs if you use those flows.
.\start-dev.ps1
```

This starts MongoDB when needed, then the backend on `http://localhost:8080` and the frontend on `http://127.0.0.1:4200`.

### Manual start

```powershell
# MongoDB (required if you are not using Atlas)
docker-compose up -d mongodb

# Backend
cd maxro-backend
.\mvnw.cmd spring-boot:run

# Frontend (new terminal)
cd ..\maxro-frontend
npm install
npm start
```

## Auth and Public Client IDs

Google and Spotify client IDs are no longer compiled into the frontend bundle.

- Set `GOOGLE_CLIENT_ID` and `SPOTIFY_CLIENT_ID` on the backend environment
- The frontend loads them at startup from `GET /api/public-config`
- Spotify client secret stays backend-only as `SPOTIFY_CLIENT_SECRET`

## Configuration

Configuration is loaded from environment variables and local `.env` files.

- Use `.env.example` as the template for local development.
- Keep secret values out of source control and CI logs.
- For setup details, see [docs/SETUP.md](docs/SETUP.md).

## Launch Checklist

See [docs/PRODUCTION_SMOKE_TESTS.md](docs/PRODUCTION_SMOKE_TESTS.md) for the final regression checklist before deployment.
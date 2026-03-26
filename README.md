# Maxro

Maxro is a full-stack fitness tracking app for logging workouts, tracking personal records, monitoring nutrition and hydration, and reviewing long-term progress in one place.

Production: [gomaxro.com](https://gomaxro.com)

## What It Does

- Log workouts with exercises, sets, reps, weight, and muscle groups
- Track weighted and bodyweight PRs automatically
- Monitor calories, macros, micros, and water intake
- Visualize progress with dashboard and analytics views
- Support login flows with email/password and Google sign-in
- Integrate Spotify controls and in-app AI fitness support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, TypeScript, Angular Material, Apollo Angular, ngx-charts |
| Backend | Spring Boot, Java 21, Spring Security, Spring for GraphQL |
| API | GraphQL with supporting REST endpoints |
| Database | MongoDB |
| Integrations | USDA FoodData Central, FatSecret, Spotify, Google Sign-In, Google AI |
| DevOps | Docker, Azure, Azure DevOps Pipelines, Playwright, JUnit |

## Repo Layout

- `maxro-frontend` - Angular client
- `maxro-backend` - Spring Boot API
- `docs` - setup notes and deployment/testing references

## Run Locally

```powershell
Copy-Item .env.example .env
.\start-dev.ps1
```

This starts the backend on `http://localhost:8080` and the frontend on `http://127.0.0.1:4200`.

For full setup details, environment variables, and manual startup instructions, see [docs/SETUP.md](docs/SETUP.md).

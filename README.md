# Maxro

Full-stack fitness tracking platform — a Strava x MyFitnessPal hybrid for logging workouts, tracking PRs, monitoring nutrition, and managing daily water intake.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, TypeScript, Angular Material, ngx-charts |
| Backend | Spring Boot 3.5.11, Java 21 |
| API | GraphQL (Spring for GraphQL + Apollo Angular) |
| Database | MongoDB |
| Food Data | Nutritionix API |
| Deployment | Azure Container Apps (backend), Azure Static Web Apps (frontend) |
| CI/CD | Azure DevOps Pipelines |
| Containers | Docker, Docker Compose |

## Features

- **Workout Logging** — exercises, sets, reps, weight, muscle groups
- **PR Tracking** — automatic personal record detection with estimated 1RM
- **Workout Streaks** — current and longest streak tracking
- **Nutrition Logging** — Nutritionix API food search, per-meal tracking
- **Macro Dashboard** — daily progress bars for calories, protein, carbs, fat
- **Water Intake** — log glasses/oz with visual progress ring
- **Analytics** — strength progress charts, macro trends, water consistency
- **Dashboard** — daily summary of all fitness data in one view
- **User Profile** — body weight, height, goals, macro/water targets

## Prerequisites

- Java 21
- Node.js 20+
- Docker & Docker Compose
- MongoDB (or use Docker Compose)

## Local Development

### With Docker Compose (recommended)

```bash
# Set Nutritionix API keys (optional for food search)
export NUTRITIONIX_APP_ID=your_app_id
export NUTRITIONIX_API_KEY=your_api_key

# Start all services
docker-compose up --build
```

- Frontend: http://localhost
- Backend GraphiQL: http://localhost:8080/graphiql
- MongoDB: localhost:27017

### Manual Setup

**1. Start the backend first** (required for GraphQL):

```bash
cd maxro-backend
./mvnw spring-boot:run
```

**2. Start the frontend** (proxies /graphql to backend):

```bash
cd maxro-frontend
npm install
npm start
```

- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- GraphQL requests from the frontend are proxied to the backend via `proxy.conf.json`

## Project Structure

```
Maxro/
├── maxro-backend/
│   ├── src/main/java/com/maxro/maxro_backend/
│   │   ├── config/          # Security, CORS, WebClient, MongoDB config
│   │   ├── model/           # MongoDB document models
│   │   ├── repository/      # Spring Data MongoDB repositories
│   │   ├── service/         # Business logic (interfaces + implementations)
│   │   ├── resolver/        # GraphQL query/mutation resolvers
│   │   ├── dto/             # Request/response DTOs (Java records)
│   │   ├── security/        # JWT filter, token provider
│   │   ├── exception/       # Custom exceptions, global handler
│   │   └── util/            # Fitness calculators
│   ├── src/main/resources/
│   │   ├── graphql/schema.graphqls
│   │   └── application.properties
│   ├── Dockerfile
│   └── azure-pipelines.yml
├── maxro-frontend/
│   ├── src/app/
│   │   ├── core/            # Services, models, guards, GraphQL config
│   │   ├── features/        # Feature components (auth, dashboard, workouts, etc.)
│   │   └── shared/          # Reusable UI components
│   ├── Dockerfile
│   ├── nginx.conf
│   └── azure-pipelines.yml
├── docker-compose.yml
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/maxro` |
| `JWT_SECRET` | JWT signing secret (min 256 bits) | dev default |
| `JWT_ACCESS_EXPIRATION` | Access token TTL (ms) | `900000` (15 min) |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (ms) | `604800000` (7 days) |
| `NUTRITIONIX_APP_ID` | Nutritionix API app ID | — |
| `NUTRITIONIX_API_KEY` | Nutritionix API key | — |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:4200` |
| `SERVER_PORT` | Backend server port | `8080` |

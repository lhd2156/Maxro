# Azure DevOps Secrets and Variables

Use a variable group named `maxro-secrets`.

## Backend deployment variables

These are used by `maxro-backend/azure-pipelines.yml`.

### Required Azure infrastructure values

- `ACR_NAME`
- `AZURE_SERVICE_CONNECTION`
- `RESOURCE_GROUP`

### Required backend app values

- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGINS`

### Recommended auth and integration values

- `GOOGLE_CLIENT_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `USDA_FOODDATA_API_KEY`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_AI_MODEL`

### Optional backend overrides

- `JWT_ACCESS_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`
- `SERVER_PORT`
- `APP_LOG_LEVEL`
- `GRAPHIQL_ENABLED`
- `AZURE_LOCATION`
- `CONTAINER_APP_ENVIRONMENT`

## Frontend deployment variables

These are used by `maxro-frontend/azure-pipelines.yml`.

- `SWA_DEPLOYMENT_TOKEN`
- `SWA_HOSTNAME`

## Safe placeholder example

Use temporary placeholders until you swap in real values:

```text
ACR_NAME=replacewithacrname
RESOURCE_GROUP=maxro-rg
AZURE_LOCATION=centralus
CONTAINER_APP_ENVIRONMENT=maxro-env
MONGODB_URI=mongodb+srv://replace-me
JWT_SECRET=replace-me-with-a-long-random-secret
CORS_ORIGINS=https://replace-me.azurestaticapps.net
GOOGLE_CLIENT_ID=replace-me.apps.googleusercontent.com
SPOTIFY_CLIENT_ID=replace-me
SPOTIFY_CLIENT_SECRET=replace-me
USDA_FOODDATA_API_KEY=replace-me
FATSECRET_CLIENT_ID=replace-me
FATSECRET_CLIENT_SECRET=replace-me
GOOGLE_AI_API_KEY=replace-me
GOOGLE_AI_MODEL=gemini-2.5-flash
JWT_ACCESS_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000
SERVER_PORT=8080
APP_LOG_LEVEL=INFO
GRAPHIQL_ENABLED=false
```

## Notes

- The backend pipeline now builds images directly with Azure Container Registry using your Azure service connection, so a separate Docker service connection is no longer required.
- The backend deploy step will create the Container Apps environment and the `maxro-backend` app if they do not already exist.
- The frontend does not need Google or Spotify IDs in its own pipeline because Maxro loads those public client IDs from the backend at runtime.
- Replace all placeholder values before production launch.
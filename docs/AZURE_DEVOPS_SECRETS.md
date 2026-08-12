# Azure DevOps Secrets and Variables

Use the variable group `maxro-secrets` for application configuration. Azure infrastructure identifiers are defined in the pipeline YAML so an account swap is visible in code review.

## Current nonsecret values

```text
AZURE_SERVICE_CONNECTION=maxro-azure-sc-v5
ACR_NAME=maxroacr1e506
COSMOS_ACCOUNT_NAME=maxrocosmos1e506
MONGO_DATABASE_NAME=maxro
RESOURCE_GROUP=maxro-rg
AZURE_LOCATION=centralus
CONTAINER_APP_ENVIRONMENT=maxro-env
BACKEND_APP_NAME=maxro-backend
FRONTEND_APP_NAME=maxro-web
CORS_ORIGINS=https://gomaxro.com,https://www.gomaxro.com,https://maxro-web.yellowmoss-96683f19.centralus.azurecontainerapps.io,https://witty-sea-090e02110.7.azurestaticapps.net,http://localhost:4200,http://127.0.0.1:4200
```

## Required backend secret

- `JWT_SECRET`: at least 32 characters. Keep the existing value if sessions should remain valid.

The backend pipeline obtains the production Mongo URI from `COSMOS_ACCOUNT_NAME`; do not copy a local `localhost` URI into Azure.

## Integration values

Keep these in `maxro-secrets` when the corresponding feature is used:

- `GOOGLE_CLIENT_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `USDA_FOODDATA_API_KEY`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_AI_MODEL`

Optional overrides:

- `JWT_ACCESS_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`
- `SERVER_PORT`
- `APP_LOG_LEVEL`
- `GRAPHIQL_ENABLED`

## Frontend deployment

The frontend pipeline requires no Static Web Apps deployment token and no local container engine. It fetches short-lived ACR credentials through `maxro-azure-sc-v5`, publishes the Angular bundle as an OCI layer, and deploys `maxro-web`.

Public Google and Spotify client IDs are loaded from the backend at runtime; they do not need separate frontend variables.

## Service connection

`maxro-azure-sc-v5` stores its service-principal credential inside Azure DevOps. The service principal is Contributor-scoped to `maxro-rg`. Never place that credential in this file, `.env`, a pipeline variable, or GitHub.

During the next account swap, create a new service principal in the new Azure tenant and a new Azure Resource Manager service connection. Authorize the two real pipelines, then update the YAML's `AZURE_SERVICE_CONNECTION` value.

# Azure Account Switch

Last verified: August 11, 2026.

## Production architecture

- Frontend: Azure Container Apps (`maxro-web`)
- Backend: Azure Container Apps (`maxro-backend`)
- Container Apps environment: `maxro-env`
- Image registry: Azure Container Registry
- Database: Azure Cosmos DB for MongoDB
- Resource group: `maxro-rg`
- Azure DevOps project: `https://dev.azure.com/louisdo/Maxro`
- Self-hosted agent pool: `Default`

The Azure Static Web App named `maxro-frontend` is a backup only. Production `www.gomaxro.com` runs from `maxro-web`. This avoids the global Static Web Apps hostname reservation that can remain attached to an expired subscription.

## Current Azure footprint

```text
Subscription ID: 650307b6-aa34-4ec2-9abd-fbd2b141e506
Tenant ID: 1f8b8e6c-2554-4132-9daf-9cf7255a778b
Service connection: maxro-azure-sc-v5
ACR: maxroacr1e506.azurecr.io
Cosmos account: maxrocosmos1e506
Backend: maxro-backend.yellowmoss-96683f19.centralus.azurecontainerapps.io
Frontend: maxro-web.yellowmoss-96683f19.centralus.azurecontainerapps.io
Static Web App backup: witty-sea-090e02110.7.azurestaticapps.net
```

Both Container Apps use one minimum replica to avoid demo cold starts.

## Current DNS

```text
@          A      20.221.42.194
asuid      TXT    34E4AA975238AD8F6B5804035A50E9829185C9EE3D1E72D186055A7BCD2B1959
api        CNAME  maxro-backend.yellowmoss-96683f19.centralus.azurecontainerapps.io
asuid.api  TXT    34E4AA975238AD8F6B5804035A50E9829185C9EE3D1E72D186055A7BCD2B1959
www        CNAME  maxro-web.yellowmoss-96683f19.centralus.azurecontainerapps.io
asuid.www  TXT    34E4AA975238AD8F6B5804035A50E9829185C9EE3D1E72D186055A7BCD2B1959
```

The apex is bound to the backend, which returns an HTTPS `301` to `https://www.gomaxro.com`. Keep the domain's SPF TXT record if one exists.

## One-command rebuild

After logging into the intended Azure subscription, run:

```powershell
.\scripts\rebuild-azure-account.ps1 -SkipDns
```

The script creates or reuses:

- the resource group, ACR, and Container Apps environment
- Cosmos DB for MongoDB and the `maxro` database
- the frontend and backend Container Apps
- warm replica settings
- production images and app secrets

It prints the DNS records required for the new Container Apps environment. If Namecheap API credentials are configured, use `-DnsProvider namecheap` instead of `-SkipDns` to update and bind the records automatically.

The frontend publisher in `scripts/publish-frontend-container.ps1` does not need Docker Desktop, Podman, or ACR Tasks. It verifies a pinned `crane` release, creates an OCI layer from the Angular build and Nginx config, and pushes directly to ACR. The backend uses Jib when ACR Tasks are unavailable.

## Pipeline deployment

- `maxro-backend/azure-pipelines.yml` builds, deploys, binds, and health-checks the backend.
- `maxro-frontend/azure-pipelines.yml` builds Angular, publishes a daemonless container image, updates `maxro-web`, waits for the new revision, and checks `https://www.gomaxro.com`.
- Both pipelines use the Azure Resource Manager service connection `maxro-azure-sc-v5`.
- The service principal has Contributor access scoped to `maxro-rg`, not the full subscription.

For the next subscription, create a new service connection before changing the pipeline's `AZURE_SERVICE_CONNECTION`, ACR, Cosmos, and generated hostname values. Do not reuse a connection whose subscription is disabled.

## Mongo and app secrets

The backend pipeline resolves its production Mongo connection string from the current Cosmos account. A stale local `MONGODB_URI` does not need to be copied into Azure DevOps.

These app values can stay the same during an account swap unless they are intentionally rotated:

- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `USDA_FOODDATA_API_KEY`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_AI_MODEL`

Never commit service-principal credentials, ACR passwords, deployment tokens, Namecheap API keys, or Mongo connection strings.

## Verification

```powershell
curl.exe -I https://gomaxro.com/ --max-time 30
curl.exe -I https://www.gomaxro.com/ --max-time 30
curl.exe -s https://api.gomaxro.com/actuator/health --max-time 30
```

Expected results:

- apex: `301` to `https://www.gomaxro.com/`
- frontend: `200`
- backend: JSON with `"status":"UP"`

A release is not finished until a fresh browser loads the landing page, registration and login reach the dashboard, GraphQL calls return `200`, and the disposable account is deleted.

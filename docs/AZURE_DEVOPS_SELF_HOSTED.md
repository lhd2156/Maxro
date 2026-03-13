# Azure DevOps Self-Hosted Agent

Azure DevOps is currently failing because the org does not have Microsoft-hosted parallelism enabled yet.
The cheapest fix is to run the pipelines on your own machine through the free `Default` self-hosted pool.

## What changed

- Backend pipeline now targets the `Default` pool.
- Frontend pipeline now targets the `Default` pool.
- A helper script exists at `scripts/setup-azdo-agent.ps1`.

## One-time setup

1. Create an Azure DevOps PAT with these scopes:
   - `Agent Pools (Read & manage)`
   - `Build (Read & execute)`
   - `Code (Read)`
2. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-azdo-agent.ps1 -Pat "<YOUR_PAT>"
```

3. Start the agent:

```powershell
C:\azagent\run.cmd
```

Once the agent shows up as online in the Azure DevOps `Default` pool, the `maxro-backend` and `maxro-frontend` pipelines can run without paid hosted agents.

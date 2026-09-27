# Infrastructure (AWS)

| Piece | Service | Defined in |
|---|---|---|
| Web app (Next.js, SSR + API routes) | AWS Amplify Hosting | `amplify.yml` (repo root), connected in the Amplify console |
| Nightly data pipeline | AWS Lambda (Node 22, arm64) + EventBridge Scheduler | `infra/template.yaml` (AWS SAM) |
| Secrets | AWS Secrets Manager | created by hand (below) |
| Failure alerts | CloudWatch alarm + SNS email | `infra/template.yaml` |
| Database | Supabase Postgres + PostGIS (not AWS) | `supabase/migrations/` |

## One-time setup (VS Code terminal, WSL Ubuntu)

```bash
# 0. Billing guardrail first: AWS Console -> Billing -> Budgets -> create a $10 and a $50 alert.

# 1. Secret for the pipeline
aws secretsmanager create-secret --name cuida-hou/etl \
  --secret-string '{"SUPABASE_URL":"https://YOUR.supabase.co","SUPABASE_SERVICE_ROLE_KEY":"...","CENSUS_API_KEY":"...","SOCRATA_APP_TOKEN":"..."}'

# 2. Deploy the pipeline
cd services/etl && npm ci --omit=dev && cd ../..
sam build -t infra/template.yaml
sam deploy --guided --stack-name cuida-hou-etl \
  --parameter-overrides SecretArn=<arn from step 1> AlertEmail=<you@example.com>

# 3. Test run without writing to the database
aws lambda invoke --function-name cuida-hou-etl --payload '{"dryRun":true}' \
  --cli-binary-format raw-in-base64-out out.json && cat out.json
```

## Amplify Hosting

1. Amplify console -> Create app -> connect this GitHub repo, branch `main`.
2. Amplify detects the monorepo through `amplify.yml`. App root: `apps/web`. Also set the environment variable `AMPLIFY_MONOREPO_APP_ROOT=apps/web`.
3. Add environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Server-side variables are not exposed to the Next.js runtime automatically. `amplify.yml` writes them to `.env.production` during the build. Only put public-safe values here (the anon key is public by design; the service role key must never go in Amplify).
5. Confirm Amplify supports the Next.js version in `apps/web/package.json` before upgrading it.

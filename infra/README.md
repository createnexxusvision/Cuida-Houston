# Deploying Cuida HOU on AWS

Everything runs in one AWS account. No VPC setup, no NAT gateway: the pipeline and the web app talk to the database through the **RDS Data API** over HTTPS.

```
Amplify Hosting (Next.js SSR) ──IAM compute role──► RDS Data API ──► Aurora Serverless v2 (Postgres + PostGIS)
EventBridge Scheduler 3 a.m. CT ──► Lambda cuida-hou-etl ──► RDS Data API ─┘
Secrets Manager: master login (pipeline) · cuida_web login (web, read-only) · API keys
```

| Piece | Service | Defined in |
|---|---|---|
| Database | Aurora Serverless v2, PostgreSQL 16, Data API on, auto-pause | `infra/template.yaml` |
| Nightly pipeline | Lambda (Node 22, arm64) + EventBridge Scheduler | `infra/template.yaml` |
| Secrets | Secrets Manager (3 secrets) | `infra/template.yaml` |
| Failure alerts | CloudWatch alarm + SNS email | `infra/template.yaml` |
| Web app | Amplify Hosting + SSR compute role | `amplify.yml` + console steps below |

## Cost (estimates; check the AWS pricing pages)

- Aurora Serverless v2 is billed per ACU-hour (about $0.12 in us-east-1) plus storage. With `MinCapacity=0` it pauses after an hour idle and costs close to nothing between uses. Holding it at 0.5 ACU all day is roughly $1.50/day.
- Lambda, EventBridge, SNS, Data API calls and Amplify at hackathon traffic: cents to a few dollars.
- The $100 credit covers the hackathon and a pilot month comfortably. **Set a Budgets alert at $10 and $50 first.**

## Deploy (VS Code terminal, WSL Ubuntu, Node 22)

Prereqs: AWS CLI v2 (`aws configure`), AWS SAM CLI, region `us-east-1` (or your choice; stay consistent).

```bash
# 0. Guardrail: AWS Console -> Billing -> Budgets -> $10 and $50 alerts to your email.

# 1. Confirm an Aurora PostgreSQL 16 version that supports auto-pause (16.3 or newer)
aws rds describe-db-engine-versions --engine aurora-postgresql \
  --query "DBEngineVersions[?starts_with(EngineVersion,'16')].EngineVersion" --output text

# 2. Deploy the stack (takes ~10-15 min, mostly Aurora)
cd services/etl && npm install --omit=dev && cd ../..
sam build -t infra/template.yaml
sam deploy --guided --stack-name cuida-hou \
  --parameter-overrides AlertEmail=you@example.com EngineVersion=16.6 MinCapacity=0.5
#   -> confirm the SNS subscription email AWS sends you

# 3. Read the outputs
aws cloudformation describe-stacks --stack-name cuida-hou --query "Stacks[0].Outputs" --output table

# 4. Put your real API keys in the app-keys secret (never paste them in chat or commit them)
aws secretsmanager put-secret-value --secret-id cuida-hou/app-keys \
  --secret-string '{"CENSUS_API_KEY":"<your key>","SOCRATA_APP_TOKEN":"<your token>"}'

# 5. Create tables, the read-only web login, and the pathway content (runs from your laptop via the Data API)
export DB_DRIVER=data-api DB_NAME=cuida
export DB_CLUSTER_ARN=<DbClusterArn> DB_SECRET_ARN=<MasterSecretArn> WEB_SECRET_ARN=<WebSecretArn>
npm run db:seed -w @cuida-hou/etl

# 6. First data load: dry run (writes nothing), then the real run
aws lambda invoke --function-name cuida-hou-etl --payload '{"dryRun":true}' \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 900 out.json && cat out.json
aws lambda invoke --function-name cuida-hou-etl --payload '{}' \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 900 out.json && cat out.json

# 7. Bus stops + ZIP centroids (download METRO GTFS and the Census ZCTA Gazetteer file first)
cd services/etl
node src/load-static.js --gtfs ./data/metro-gtfs --gazetteer ./data/2024_Gaz_zcta_national.txt
```

## Amplify Hosting

1. Amplify console -> **Create new app** -> GitHub -> `createnexxusvision/Cuida-Houston`, branch `main`.
2. Monorepo: app root `apps/web`. Amplify reads `amplify.yml`.
3. **Environment variables:** `AMPLIFY_MONOREPO_APP_ROOT=apps/web`, `DB_CLUSTER_ARN=<DbClusterArn>`, `DB_SECRET_ARN=<WebSecretArn>` (the **web** secret, not the master), `DB_NAME=cuida`, `DB_DRIVER=data-api`.
4. **App settings -> IAM roles -> Compute role -> Edit ->** choose `cuida-hou-web-compute`. Because the repo is public, AWS recommends attaching the role at the **branch** level (`main`) rather than app-wide, and not enabling pull-request previews.
5. Deploy. Open `/es`, search `77021`.

## Before the demo

- Set `MinCapacity=0.5` (redeploy with that parameter) so the first search isn't delayed by a ~15 s resume. Set it back to 0 afterward.
- Run the pipeline once the morning of the demo so "Updated" dates are current.

## Security model

- The web app's database login (`cuida_web`) can only call `search_providers()` and read three reference tables. It cannot read raw provider rows (home addresses) or write anything. `services/etl/test/e2e-local.mjs` proves this and runs in CI.
- The master secret is only used by the pipeline Lambda and by migrations from your laptop.
- No access keys are stored anywhere: Lambda and Amplify use IAM roles.

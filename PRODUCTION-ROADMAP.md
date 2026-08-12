# Fernway — Production Roadmap

Where you are: GitHub repo created, 3-tier app running locally via Docker Compose, frontend and backend confirmed talking to each other and saving real orders to Postgres.

This document is the plan for everything from here to a live, monitored, auto-scaling app on AWS, triggered automatically by every `git push`.

---

## The full flow, end to end

```
You push code to GitHub
        ↓
Jenkins detects the push (webhook), starts a pipeline
        ↓
Pipeline builds Docker images (frontend + backend), runs tests
        ↓
Images pushed to ECR (AWS's container registry)
        ↓
Pipeline deploys the new images to EC2 instances (via Auto Scaling Group)
        ↓
App is live behind a Load Balancer, backed by RDS Postgres
        ↓
Prometheus/Grafana watch it; Alertmanager pages you if something breaks
```

Terraform is what *creates* the AWS resources in that diagram (VPC, EC2, RDS, load balancer). Jenkins is what *uses* them on every push. We build Terraform first — there's nothing for Jenkins to deploy to otherwise.

---

## Phase 1 — AWS account setup

1. Create an AWS account if you don't have one: [aws.amazon.com](https://aws.amazon.com) (needs a card, but everything here fits in the free tier if we're careful — I'll flag anything that costs money before we create it)
2. **Do not use your root account for daily work.** Create an IAM user for yourself with admin permissions instead:
   - AWS Console → IAM → Users → Create user → attach `AdministratorAccess` policy (fine for learning; a real company would scope this down)
   - Generate an **Access Key** for this user (Security credentials tab)
3. Install the AWS CLI on your machine: [aws.amazon.com/cli](https://aws.amazon.com/cli/)
4. Configure it with the keys from step 2:
   ```
   aws configure
   ```
   It'll ask for Access Key, Secret Key, region (use `us-east-1` unless you have a reason not to), and output format (`json` is fine).
5. Verify it works:
   ```
   aws sts get-caller-identity
   ```
   Should print your account ID and IAM user — proof the CLI can talk to your AWS account.
6. **Set a billing alarm** now, before creating anything: AWS Console → Billing → Budgets → create a budget alert at, say, $10. This is a five-minute step that prevents nasty surprises.

---

## Phase 2 — Terraform (build the AWS infrastructure)

Install Terraform: [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads)
```
terraform -version
```

**What Terraform will create for you** (this is what we build together next):
- A VPC (isolated network) with public and private subnets
- An RDS Postgres instance (replaces your local `db` container)
- An ECR repository (stores your Docker images in AWS)
- A Launch Template + Auto Scaling Group of EC2 instances running your containers
- An Application Load Balancer in front of them
- Separate copies of all of the above for `dev`, `staging`, and `prod`

**The commands you'll run** (once the `.tf` files exist):
```
terraform init      # downloads AWS provider plugins
terraform plan       # shows exactly what will be created — review this every time
terraform apply       # actually creates the resources
terraform destroy      # tears it all down (use this to avoid ongoing costs when not actively working)
```

**Rule to keep in mind:** always run `terraform plan` and actually read it before `apply`. This is the single habit that separates safe infra work from accidental production outages.

This is the next thing we'll build together — I'll write the actual `.tf` files with you, one resource at a time, and explain each one.

---

## Phase 3 — Jenkins (CI/CD pipeline)

Jenkins itself will run as a container (we'll add it to a `docker-compose.yml` or, more realistically, on its own small EC2 instance).

**What the pipeline does on every push:**
1. Checks out your code
2. Installs dependencies, runs any tests
3. Builds the frontend and backend Docker images
4. Pushes both images to ECR
5. Triggers an EC2 instance refresh so the Auto Scaling Group picks up the new image

**The GitHub connection:**
GitHub repo → Settings → Webhooks → add Jenkins' URL, set to trigger on `push`. From that point on, every `git push` really does kick off the pipeline automatically — which is the thing you asked for.

**Branch → environment mapping:**
- push to `dev` → deploys to the dev environment
- push to `staging` → deploys to staging
- push to `main` → deploys to prod (usually with a manual approval click, even at real companies)

This is where we'll write the actual `Jenkinsfile` together.

---

## Phase 4 — Monitoring (Prometheus + Grafana)

- Prometheus scrapes metrics from your backend and EC2 instances
- We'll add a `/metrics` endpoint to `server.js` (a small library called `prom-client` does this)
- Grafana turns those metrics into dashboards (requests/sec, error rate, response time, CPU/memory)
- Alertmanager sends a Slack or email alert automatically if error rate spikes or a server goes down

---

## Phase 5 — Security pass

- HTTPS via AWS Certificate Manager + the load balancer (free, auto-renewing certs)
- Database credentials in AWS Secrets Manager, not in `.env` files
- IAM roles on the EC2 instances instead of hardcoded AWS keys
- Security groups locked down (only the load balancer can reach the app servers; only the app servers can reach the database)
- Image scanning on ECR (catches known vulnerabilities in your Docker images automatically)

---

## Phase 6 — Separate environments (dev / staging / prod)

Each environment gets its own complete copy of the infrastructure from Phase 2 — separate VPC, separate database, separate servers — so testing in `dev` can never accidentally affect real customer data in `prod`. Terraform handles this cleanly using either **workspaces** or separate variable files per environment; I'll show you both and we'll pick one.

---

## What we do next, right now

Phase 2 (Terraform) is the right starting point — everything else needs AWS infrastructure to exist first. We'll do it in small steps:
1. VPC and networking
2. RDS Postgres
3. ECR
4. EC2 + Auto Scaling Group + Load Balancer

Say the word and we'll start writing the VPC configuration together.

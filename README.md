# Fernway — Complete DevOps Project

A 3-tier e-commerce app (React + Node/Express + PostgreSQL), taken from local Docker Compose all the way to a monitored, auto-scaling deployment on AWS EKS.

## Structure

```
fernway-devops/
  frontend/          # React storefront (Vite build → Nginx)
  backend/            # Express API, exposes /health and /metrics
  db-init/             # Postgres schema + seed data (local Docker Compose only)
  docker-compose.yml    # Local dev environment — all 5 services, one command
  terraform/             # Infrastructure as code (VPC, EKS, RDS, ECR, ALB controller)
  k8s/
    base/                  # Shared manifests every environment uses
    overlays/dev|staging|prod/  # Per-environment image tags, replica counts, patches
  argocd/                    # GitOps: watches Git, syncs the cluster to match it
  jenkins/                     # CI pipeline: test, scan, build, push, update Git
  ansible/                      # Bootstraps any plain EC2 boxes outside the cluster
  monitoring/                    # Prometheus scrape config + Grafana datasource/dashboard
  sonar-project.properties        # SonarQube project definition
  SETUP-GUIDE.md                   # Local setup walkthrough
  PRODUCTION-ROADMAP.md             # Full phase-by-phase plan
```

## Local development

```bash
docker compose up --build
```
See `SETUP-GUIDE.md` for full details.

## Deploying to AWS

1. **Terraform** — provisions the VPC, EKS cluster, RDS database, ECR repos, and the ALB Ingress Controller. See `terraform/README.md`.
2. **ArgoCD** — install it in the cluster and bootstrap the app-of-apps. See `argocd/README.md`.
3. **Jenkins** — set up credentials, the multibranch job, SonarQube. See `jenkins/README.md`.
4. **Push code** — from here on, every push to `dev`/`staging`/`main` runs the pipeline: test → SonarQube → build → Trivy scan → push to ECR → update the Git overlay → ArgoCD syncs the cluster automatically (prod requires a manual click in the ArgoCD UI, by design).

The actual "deploy" step is a Git commit, not a Jenkins-to-cluster connection — that's the GitOps model. Jenkins never touches the cluster directly.

## What's real vs. templated here

- `frontend/`, `backend/`, `db-init/`, `docker-compose.yml`, `terraform/` — tested and working (backend endpoints verified with curl against a real running Postgres; Terraform syntax written carefully but not yet `terraform apply`'d — do that yourself first)
- `k8s/*.yaml` — valid Kubernetes YAML (parsed and verified), but `064589995443` placeholders need your real AWS account ID before applying
- `ansible/`, `monitoring/` — scaffolding with real, working configuration, ready to point at real infrastructure once it exists

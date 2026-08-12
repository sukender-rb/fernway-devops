# Fernway — Complete DevOps Project

A 3-tier e-commerce app (React + Node/Express + PostgreSQL), taken from local Docker Compose all the way to a monitored, auto-scaling deployment on AWS EKS.

## Structure

```
fernway-devops/
  frontend/          # React storefront (Vite build → Nginx)
  backend/            # Express API, exposes /health and /metrics
  db-init/             # Postgres schema + seed data (local Docker Compose only)
  docker-compose.yml    # Local dev environment — all 3 tiers, one command
  terraform/             # Infrastructure as code (VPC, EKS, RDS, ECR, ALB controller)
  k8s/                     # Kubernetes manifests — how the app actually runs in the cluster
  ansible/                  # Bootstraps any plain EC2 boxes outside the cluster (e.g. Jenkins)
  monitoring/                # Prometheus scrape config + Grafana datasource/dashboard
  SETUP-GUIDE.md               # Local setup walkthrough
  PRODUCTION-ROADMAP.md         # Full phase-by-phase plan
```

## Local development

```bash
docker compose up --build
```
See `SETUP-GUIDE.md` for full details.

## Deploying to AWS

1. **Terraform** — provisions the VPC, EKS cluster, RDS database, ECR repos, and the ALB Ingress Controller. See `terraform/README.md`.
2. **Build & push images** — build the frontend/backend Docker images and push to the ECR repos Terraform created.
3. **Kubernetes** — apply the manifests in `k8s/`, in this order:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl create secret generic fernway-db-secret --namespace fernway \
     --from-literal=DATABASE_URL="<from terraform output rds_endpoint>"
   kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-service.yaml -f k8s/backend-hpa.yaml
   kubectl apply -f k8s/frontend-deployment.yaml -f k8s/frontend-service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```
4. **Monitoring** — install `kube-prometheus-stack` via Helm, then layer in the scrape config and dashboard from `monitoring/`. See `monitoring/prometheus/prometheus.yml` for exact commands.
5. **CI/CD** — every push to GitHub triggers a pipeline that rebuilds images, pushes to ECR, and re-applies the `k8s/` manifests automatically. Pipeline definition TBD — see the note in `PRODUCTION-ROADMAP.md`.

## What's real vs. templated here

- `frontend/`, `backend/`, `db-init/`, `docker-compose.yml`, `terraform/` — tested and working (backend endpoints verified with curl against a real running Postgres; Terraform syntax written carefully but not yet `terraform apply`'d — do that yourself first)
- `k8s/*.yaml` — valid Kubernetes YAML (parsed and verified), but `<ACCOUNT_ID>` placeholders need your real AWS account ID before applying
- `ansible/`, `monitoring/` — scaffolding with real, working configuration, ready to point at real infrastructure once it exists

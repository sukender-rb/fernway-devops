# Fernway — Terraform (dev environment)

## What this creates

- A VPC with public, private, and database subnets across 2 AZs
- An EKS cluster (Kubernetes 1.29) with an auto-scaling node group
- Two ECR repositories (frontend, backend) with vulnerability scanning on push
- An RDS Postgres instance, reachable only from inside the cluster
- The AWS Load Balancer Controller, so Kubernetes Ingress objects turn into real ALBs

## What this does NOT create yet

- The actual Kubernetes Deployment/Service/Ingress manifests for your app — that's the next step, after this infra exists
- Jenkins itself
- Prometheus/Grafana
- staging/prod copies (this is `dev` only — copying to another environment is a later step, once this one is proven out)

## ⚠️ Cost warning

This is **not free-tier only**. Running components:
- EKS control plane: ~$0.10/hour (~$73/month if left running)
- 2× t3.medium nodes: ~$0.08/hour combined
- NAT Gateway: ~$0.045/hour + data
- RDS db.t3.micro: free-tier eligible for 12 months, otherwise ~$0.017/hour

**Run `terraform destroy` whenever you're not actively working on this**, unless you're intentionally leaving it up. Left running 24/7, this is roughly $100–150/month.

## Prerequisites

```bash
aws configure                        # if you haven't already
aws sts get-caller-identity          # confirms it's working
```

Install: Terraform CLI, `kubectl`, `helm` (helm is only needed if you want to run helm commands yourself — Terraform's helm provider handles the ALB controller install for you).

## Setup

```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars if you want different region/cluster name

export TF_VAR_db_password="something-long-and-random"   # PowerShell: $env:TF_VAR_db_password = "..."
```

## Run it

```bash
terraform init      # downloads providers + the VPC/EKS/IAM modules
terraform validate   # catches syntax errors before anything touches AWS
terraform plan        # READ THIS OUTPUT before applying — always
terraform apply        # takes 15-20 minutes, mostly waiting on the EKS control plane
```

## After it applies

```bash
# Point kubectl at your new cluster (also printed as a Terraform output)
aws eks update-kubeconfig --region eu-west-1 --name fernway-dev

# Confirm you can see the cluster
kubectl get nodes

# Confirm the ALB controller is running
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

## Tear down

```bash
terraform destroy
```
Review the plan it shows before confirming — same discipline as `apply`.

## What's next

1. Write Kubernetes manifests (Deployment, Service, Ingress) for the frontend and backend, pointing the backend's `DATABASE_URL` at the `rds_endpoint` output
2. Manually build + push images to the two ECR repos once, deploy manifests, confirm the site is reachable through the ALB
3. Then wire Jenkins to do that build/push/deploy automatically on every `git push`

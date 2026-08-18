# Jenkins — Setup Guide

## 1. Start Jenkins locally

```bash
docker compose up --build jenkins
```

First build takes a while — it's installing Docker CLI, AWS CLI, kubectl, and Trivy into the image. Once it's running:

```
http://localhost:8080
```

## 2. Get the initial admin password

```bash
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Paste that into the browser. Since the setup wizard is disabled, you'll go straight to installing plugins — choose **"Install suggested plugins"**, then create your own admin user when prompted.

## 3. Install the plugins this pipeline needs

**Manage Jenkins → Plugins → Available plugins**, install:
- `Docker Pipeline`
- `Amazon ECR` (or the broader `AWS Credentials` + `Pipeline: AWS Steps`)
- `Kubernetes CLI`
- `SonarQube Scanner`
- `Git` / `GitHub Branch Source` (usually already installed via "suggested plugins")

Restart Jenkins if it asks.

## What Jenkins actually does now (GitOps)

Jenkins no longer deploys to the cluster directly. It builds, tests, scans, pushes the image to ECR, then updates the image tag in `k8s/overlays/<env>/kustomization.yaml` and **commits that change back to Git**. ArgoCD (see `argocd/README.md`) is what actually applies it to the cluster. See the comment block at the top of the `Jenkinsfile` for the full flow.

This means your `github-credentials` token needs **write** access to the repo, not just read — Jenkins has to push a commit.

## 3b. Set up SonarQube (code quality scanning)

```bash
docker compose up -d sonarqube
```

**On Windows/WSL2, if the container keeps restarting:** SonarQube normally needs a higher `vm.max_map_count` on the host. The `SONAR_ES_BOOTSTRAP_CHECKS_DISABLE` flag in `docker-compose.yml` skips this for local use — if you still see it crash-looping, run this once in an admin PowerShell:
```
wsl -d docker-desktop sysctl -w vm.max_map_count=262144
```

Give it a minute or two to fully start (it runs an embedded Elasticsearch, which is slow to boot), then open:
```
http://localhost:9000
```
Log in with the default `admin` / `admin` — it'll immediately force you to set a new password.

**Create a project and a token:**
1. **Create Project → Manually** → project key: `fernway`
2. Skip the "analyze" wizard steps — Jenkins will run the actual scan
3. **My Account → Security → Generate Token** → name it `jenkins`, copy the token (shown once)

**Connect SonarQube back to Jenkins** so the quality gate result can actually reach the pipeline:
- SonarQube → **Administration → Configuration → Webhooks → Create**
  - Name: `jenkins`
  - URL: `http://jenkins:8080/sonarqube-webhook/` (container-to-container name, works because both are on the same Docker Compose network)

**Connect Jenkins to SonarQube:**
- Jenkins → **Manage Jenkins → Credentials** → add a **Secret text** credential, ID `sonar-token`, value = the token you copied
- Jenkins → **Manage Jenkins → System → SonarQube servers** → Add SonarQube
  - Name: `SonarQube` (must exactly match the name used in `withSonarQubeEnv('SonarQube')` in the Jenkinsfile)
  - Server URL: `http://sonarqube:9000`
  - Server authentication token: select the `sonar-token` credential

## 4. Add credentials

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

Add two:

| Kind | ID | Value |
|---|---|---|
| AWS Credentials | `aws-credentials` | Your IAM user's Access Key + Secret Key (the same ones from `aws configure` earlier) |
| Secret text | `aws-account-id` | Your 12-digit AWS account ID (from `aws sts get-caller-identity`) |

**Important:** these static keys are fine for learning locally. Once Jenkins itself runs on an EC2 instance (Ansible sets that instance up), switch to an IAM instance role instead — no long-lived keys at all. That's a meaningfully better security posture and worth doing before this is genuinely "production."

## 5. Create the pipeline job

**New Item → name it `fernway` → select "Multibranch Pipeline"**

- **Branch Sources → Add source → GitHub**
  - Add your GitHub credentials (a Personal Access Token works — GitHub → Settings → Developer settings → Fine-grained tokens, `repo` scope)
  - Repository URL: your `fernway-devops` repo
- **Build Configuration → Mode:** "by Jenkinsfile", **Script Path:** `jenkins/Jenkinsfile`
- Save

Jenkins scans the repo, finds your `dev`, `staging`, and `main` branches, and creates a separate pipeline for each one automatically — that's what "multibranch" means. Each branch's pipeline runs use the same `Jenkinsfile`, but the `Determine environment` stage inside it picks a different target based on `env.BRANCH_NAME`.

## 6. Connect GitHub so pushes trigger builds automatically

**On GitHub:** repo → Settings → Webhooks → Add webhook
- Payload URL: `http://<your-jenkins-address>:8080/github-webhook/`
- Content type: `application/json`
- Just the push event

**Problem to solve:** `localhost:8080` isn't reachable from GitHub's servers. For local testing, use a tunnel like [ngrok](https://ngrok.com/) (`ngrok http 8080`) and use the ngrok URL as the webhook target. Once Jenkins runs on a real EC2 instance with a public IP (later, via Terraform + Ansible), this becomes straightforward — no tunnel needed.

## 7. Test it

```bash
git checkout dev
# make a small, harmless change
git commit -am "test: trigger jenkins pipeline"
git push
```

Watch the `fernway/dev` job in Jenkins pick it up and run through: install → test → build → Trivy scan → push to ECR → deploy to EKS.

## Before this actually works end to end

This pipeline assumes things that don't exist yet:
- SonarQube configured with a project + webhook (section 3b above)
- The `fernway-dev` EKS cluster (from `terraform apply`)
- ECR repos already created (also from Terraform)
- **ArgoCD installed and bootstrapped** — see `argocd/README.md`. Jenkins now only updates Git; ArgoCD is what actually applies changes to the cluster. Without ArgoCD running, Jenkins will succeed and Git will update, but nothing will actually deploy.

Run those first.

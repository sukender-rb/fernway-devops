# Fernway — Setup Guide & Project Roadmap

A production-style DevOps project: a real 3-tier e-commerce app, taken all the way from local development to a live, monitored, auto-scaling deployment on AWS.

---

## 1. What you're building

- **Frontend:** React storefront (product listing, cart, checkout)
- **Backend:** Node.js/Express REST API
- **Database:** PostgreSQL
- **Infrastructure:** Docker → GitHub → Jenkins → Terraform (AWS) → Kubernetes → Prometheus/Grafana

Three separate environments (dev, test, prod) throughout, matching how real companies isolate work-in-progress from what customers actually see.

---

## 2. Prerequisites — install these first

| Tool | Why | Link |
|---|---|---|
| Docker Desktop | Runs the whole app in containers, no other install needed | docker.com/products/docker-desktop |
| Git | Version control, needed for GitHub | git-scm.com/downloads |
| GitHub account | Hosts the code, triggers the pipeline later | github.com |
| A code editor (VS Code recommended) | Editing files | code.visualstudio.com |

You do **not** need to install Node.js or PostgreSQL directly on your machine — they run inside Docker containers instead. This matches how the app will actually run in production later.

Verify installs:
```bash
docker --version
git --version
```

---

## 3. Project folder structure

```
fernway/
  docker-compose.yml
  db-init/
    01-schema.sql
    02-seed.sql
  backend/
    Dockerfile
    .dockerignore
    .env.example
    package.json
    db/
      schema.sql
      seed.sql
    src/
      server.js
      db.js
      routes/
        products.js
        orders.js
  frontend/
    fernway-storefront.jsx
```

If you downloaded the `fernway-project.zip` earlier, unzip it and this structure is already set up for you.

---

## 4. Run the app locally

From inside the `fernway` folder:

```bash
docker compose up --build
```

This single command:
1. Downloads and starts PostgreSQL
2. Automatically runs `01-schema.sql` then `02-seed.sql` the first time (creates tables, loads the product catalog)
3. Builds the backend image and starts the API, connected to the database

**Verify it worked** (in a second terminal):
```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/products
```

Expected: `{"status":"ok","db":"connected"}` and a JSON list of 6 plants.

**Stop everything:**
```bash
docker compose down
```
Add `-v` to also wipe the database and start completely fresh next time.

**Common issues:**
- *Port already in use* → something else is using 4000 or 5432. Stop it, or change the port mapping in `docker-compose.yml`.
- *`db: unreachable` on the health check* → the backend started before Postgres finished initializing. Compose's `depends_on: condition: service_healthy` should prevent this, but if it happens, just restart with `docker compose up`.

---

## 5. Push the project to GitHub

```bash
cd fernway
git init
git branch -M main
```

Create a `.gitignore` so you never commit secrets or generated files:
```
node_modules/
.env
*.log
```

Create a new empty repository on GitHub (no README/license, so it stays empty), then:
```bash
git add .
git commit -m "Initial commit: containerized 3-tier app"
git remote add origin https://github.com/<your-username>/fernway.git
git push -u origin main
```

Then create two more branches for the environment strategy we'll use later:
```bash
git checkout -b staging
git push -u origin staging
git checkout -b dev
git push -u origin dev
git checkout main
```

`main` → production, `staging` → test, `dev` → active development. Jenkins will later watch these branches and deploy each one to its matching environment.

---

## 6. What comes next (in order)

Each phase below only makes sense once the previous one is working — we won't skip ahead.

| Phase | What it adds | Why it matters |
|---|---|---|
| **Terraform** | Provisions real AWS infrastructure — network, database (RDS), container registry (ECR), compute — for dev/test/prod separately | Infrastructure becomes code: reviewable, repeatable, destroyable and recreatable on demand |
| **Jenkins** | CI pipeline: on every push, builds the app, runs tests, builds the Docker image, pushes it to ECR | No more manual builds; catches broken code before it reaches users |
| **Kubernetes + ArgoCD** | Runs multiple copies of the app across servers, auto-scales under load, restarts crashed containers automatically, auto-deploys from GitHub | This is the "one server → many servers as users grow" and "keep it up all the time" piece |
| **Prometheus + Grafana** | Collects metrics, builds dashboards, sends alerts (Slack/email) the moment something crashes or slows down | You find out about problems before your users complain |
| **Security pass** | HTTPS/TLS, secrets management, least-privilege IAM, network isolation, image scanning | Baseline production hygiene, and a common interview topic |
| **Go live** | Real domain, real traffic, share with friends | The payoff — a working system you can talk through end-to-end in interviews |

---

## 7. How to resume this project

When you're ready to continue, just tell me which phase to start (e.g. "let's do Terraform now"). Bring this document along for reference — everything above is the ground truth for what's already built and what's coming next.

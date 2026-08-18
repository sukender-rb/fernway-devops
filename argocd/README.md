# ArgoCD — Setup Guide

## What changes with ArgoCD in the picture

Before: Jenkins ran `kubectl set image` directly against the cluster. That's not really GitOps — the cluster's actual state could drift from what's in Git, and nothing would notice or fix it.

**Now:**
1. Jenkins builds, tests, scans, and pushes the image — same as before
2. Instead of touching the cluster, Jenkins runs `kustomize edit set image` inside `k8s/overlays/<env>/`, then **commits and pushes that change to Git**
3. **ArgoCD** — running inside the cluster — watches the repo. It sees the new commit, compares it to what's actually running, and syncs the difference
4. If anyone ever manually runs `kubectl edit` on something ArgoCD manages, ArgoCD reverts it back to match Git on the next sync (`selfHeal: true`) — Git is the only source of truth, always

This is a meaningfully different (and more correct) pattern than Jenkins deploying directly, which is why the pipeline changed.

## 1. Install ArgoCD (do this once, per cluster)

Start with the dev cluster:
```bash
aws eks update-kubeconfig --region eu-west-1 --name fernway-dev
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for everything to come up:
```bash
kubectl get pods -n argocd
```

## 2. Log into the ArgoCD UI

```bash
kubectl port-forward svc/argocd-server -n argocd 8081:443
```
Open `https://localhost:8081` (self-signed cert — your browser will warn you, that's expected for local access).

Get the auto-generated admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
Username: `admin`. Change this password after first login (Settings → User Info).

## 3. (Optional) Install the ArgoCD CLI

Windows: download the `.exe` from the [ArgoCD releases page](https://github.com/argoproj/argo-cd/releases/latest) and add it to your PATH. Then:
```bash
argocd login localhost:8081
```

## 4. Bootstrap everything with one command

Edit the `repoURL` in `argocd/root-app.yaml` and all three files in `argocd/applications/` to point at your actual GitHub repo, then:
```bash
kubectl apply -f argocd/root-app.yaml
```

This one command registers the "root" app, which in turn tells ArgoCD to watch `argocd/applications/` — which registers `fernway-dev`, `fernway-staging`, and `fernway-prod` automatically. You should see all four apps in the ArgoCD UI within a minute.

## 5. Connect the staging and prod clusters

Dev works out of the box because ArgoCD lives in that same cluster (`https://kubernetes.default.svc`). Staging and prod are **separate EKS clusters** (from Terraform), so ArgoCD needs to be told they exist:

```bash
aws eks update-kubeconfig --region eu-west-1 --name fernway-staging --alias fernway-staging
argocd cluster add fernway-staging

aws eks update-kubeconfig --region eu-west-1 --name fernway-prod --alias fernway-prod
argocd cluster add fernway-prod
```

Each command prints a cluster server URL — copy it into the matching `destination.server` field in `argocd/applications/staging-app.yaml` and `prod-app.yaml`, then commit and push. ArgoCD picks up the change automatically (it's watching its own config in Git too).

## 6. Prod is intentionally manual

Look at `argocd/applications/prod-app.yaml` — there's no `syncPolicy.automated` block. That means Jenkins can update the prod overlay in Git all it wants, but nothing actually deploys until a human clicks **Sync** in the ArgoCD UI for that app. This mirrors how real companies gate production changes — the code is ready, a person still confirms it.

## Give Jenkins push access to the repo

Jenkins now needs to `git push` (to update the overlay), not just `git pull`. In your GitHub Personal Access Token settings, make sure the token used for the `github-credentials` Jenkins credential has **write** access to the repo (not just read).

## Debugging drift or a stuck sync

```bash
argocd app get fernway-dev       # current sync status
argocd app diff fernway-dev       # what's different between Git and the cluster
argocd app sync fernway-dev        # force a sync manually
```

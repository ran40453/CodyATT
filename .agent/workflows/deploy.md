---
description: How to deploy changes to Vercel and sync data
---

# Deployment & Sync Workflow

Follow these steps to ensure changes are correctly deployed and data remains consistent.

## 1. Local Verification
- Check for console errors.
- Verify sync logs in the browser console (e.g., `Sync: Starting records sync...`).

## 2. Push to GitHub
- Ensure you are on the `main` branch.
- Commit all changes with clear messages.
- Run: `git push`

## 3. Vercel Auto-Deployment
- The push triggers an automatic build on Vercel.
- Monitor the build status on the Vercel dashboard if necessary.

## 4. Gist Connectivity (Post-Deployment)
- After deployment, go to the **Settings** page.
- Run **Test Connection** to ensure the production environment can access the Gist.
- If it returns 404, check the environment variables (`VITE_GITHUB_TOKEN`, `VITE_GIST_ID`) in Vercel.

---
// turbo
Run `git push` after committing changes.

# GitHub Pages Deployment Setup

## Current Status

✅ **Workflow File**: `.github/workflows/deploy.yml` - Updated and simplified
✅ **Vite Config**: Dynamic base path support for feature branches
❌ **GitHub Pages Settings**: Need manual configuration

## Required Manual Setup on GitHub

### Step 1: Enable GitHub Pages

1. Go to: https://github.com/Knowvana/ShiftRoaster/settings/pages
2. Under "Build and deployment":
   - **Source**: Select **GitHub Actions** (not "Deploy from a branch")
3. Click **Save**

### Step 2: Remove Environment Protection (if needed)

If you see "environment protection rules" errors:

1. Go to: https://github.com/Knowvana/ShiftRoaster/settings/environments
2. Click on **github-pages** environment
3. Under "Deployment branches", select:
   - **All branches** (or add your feature branches)
4. Click **Save protection rules**

## How to Deploy

### Push to Feature Branch

```bash
git add .
git commit -m "Your commit message"
git push origin feature/shift-roaster-2026.22.05-v1
```

### Monitor Deployment

1. Go to: https://github.com/Knowvana/ShiftRoaster/actions
2. Watch the "Deploy to GitHub Pages" workflow
3. Wait for green checkmark ✅

### Access Your Deployed Site

**Feature Branch:**
```
https://knowvana.github.io/ShiftRoaster/feature/shift-roaster-2026.22.05-v1/
```

**Main Branch (after merge):**
```
https://knowvana.github.io/ShiftRoaster/
```

## Workflow Behavior

| Branch | Base Path | URL |
|--------|-----------|-----|
| `main` | `/` | `https://knowvana.github.io/ShiftRoaster/` |
| `feature/oncall-improvements` | `/feature/oncall-improvements/` | `https://knowvana.github.io/ShiftRoaster/feature/oncall-improvements/` |
| `feature/shift-roaster-2026.22.05-v1` | `/feature/shift-roaster-2026.22.05-v1/` | `https://knowvana.github.io/ShiftRoaster/feature/shift-roaster-2026.22.05-v1/` |

## Troubleshooting

### Workflow Still Fails

1. Check the error message in Actions tab
2. Common issues:
   - GitHub Pages not enabled (see Step 1 above)
   - Environment protection blocking feature branches (see Step 2 above)
   - Build errors (check npm run build locally)

### Site Shows 404

- Wait 2-3 minutes after workflow completes
- Clear browser cache (Ctrl+Shift+Delete)
- Check URL matches your branch name exactly

### Assets Not Loading

- Verify base path is correct in Vite config
- Check browser console (F12) for 404 errors
- Base path should be: `/ShiftRoaster/feature/branch-name/`

## Next Steps

1. **Configure GitHub Pages** (see Step 1 above)
2. **Adjust Environment Protection** if needed (see Step 2 above)
3. **Push the updated workflow**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Simplify workflow for GitHub Pages"
   git push origin feature/shift-roaster-2026.22.05-v1
   ```
4. **Monitor the workflow** in Actions tab
5. **Test the deployed site** at the feature branch URL

## Questions?

If deployment still fails after these steps, check:
- GitHub Actions logs for specific error messages
- GitHub Pages settings are correctly configured
- Environment protection rules allow feature branches

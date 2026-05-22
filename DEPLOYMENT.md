# GitHub Pages Deployment Guide

## Feature Branch Deployment

Your feature branch `feature/shift-roaster-2026.22.05-v1` is configured to deploy automatically to GitHub Pages.

### Deployment URL

Once the GitHub Actions workflow completes, your site will be available at:

```
https://knowvana.github.io/ShiftRoaster/feature/shift-roaster-2026.22.05-v1/
```

### Monitoring Deployment

1. Go to: https://github.com/Knowvana/ShiftRoaster/actions
2. Look for the "Deploy to GitHub Pages" workflow
3. Wait for the green checkmark ✅
4. Visit the URL above to test your deployment

### Workflow Details

- **Trigger**: Every push to feature branches matching `feature/**`
- **Build**: Automatic npm install and build
- **Deploy**: Automatic upload to GitHub Pages
- **Base Path**: Dynamically set based on branch name

### Testing Checklist

- [ ] Site loads without errors
- [ ] Login works (admin/admin123)
- [ ] Roster displays correctly
- [ ] On-Call tracking visible
- [ ] Email notifications UI works
- [ ] Summary row shows WO/Lv/WD/OC counts
- [ ] All navigation works

### Troubleshooting

If deployment fails:
1. Check Actions tab for error logs
2. Verify workflow file exists: `.github/workflows/deploy.yml`
3. Ensure all dependencies are in package.json
4. Check that `npm run build` works locally

### Merging to Main

When ready to merge to production:

```bash
git checkout main
git pull origin main
git merge feature/shift-roaster-2026.22.05-v1
git push origin main
```

Your production site will then be available at:
```
https://knowvana.github.io/ShiftRoaster/
```

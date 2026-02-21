# SpellBlock Deployment Guide

## ⚠️ CRITICAL: Deployment Workflow

**ALWAYS deploy from the PROJECT ROOT, not from subdirectories.**

```bash
# ✅ CORRECT
cd ~/clawd/projects/clawdia-spellblock
vercel --prod

# ❌ WRONG (creates duplicate projects)
cd ~/clawd/projects/clawdia-spellblock/frontend
vercel --prod
```

## Vercel Project Configuration

- **Project Name:** `spellblock`
- **Production URL:** https://spellblock.app
- **Git Repo:** ClawdiaETH/spellblock
- **Project ID:** `prj_cCs9TRH4TKr75cUkBIoTQFYweY3K`

## Deployment Process

1. Make changes to contracts or frontend
2. Test locally
3. Commit and push to main branch
4. Deploy from project root:
   ```bash
   cd ~/clawd/projects/clawdia-spellblock
   vercel --prod --yes
   ```

## Verification

After deployment:
- Check https://spellblock.app loads
- Verify contract addresses in browser console
- Test core functionality (connect wallet, view rounds)

## Common Issues

### "No such project exists"
- Run `vercel link --project spellblock --yes` from project root
- Verify `.vercel/project.json` shows `"projectName":"spellblock"`

### Created duplicate project
- List projects: `vercel projects ls`
- Delete unwanted project: `vercel projects rm <project-name>`
- Remove stray `.vercel` folders in subdirectories

### Wrong contract addresses
- Check `frontend/src/config/contracts.ts` has correct addresses
- Verify git commit was pushed before deploy
- Clear Vercel build cache if needed

---

**Last Updated:** 2026-02-17 (after vowel validation fix)

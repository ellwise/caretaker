# Caretaker

## Run locally

`npm run start`

## Deployment

### Setup

1. Create an orphan branch named gh-pages
2. Remove all files from staging
3. Create an empty commit so that you will be able to push on the branch next
4. Push the branch
5. Come back to main
6. Add dist to .gitignore

```
git checkout --orphan gh-pages
git rm -rf .
git commit --allow-empty -m "Init empty branch"
git push origin gh-pages
git checkout main
echo "dist/" >> .gitignore
git worktree add dist gh-pages
```

### Deploy

```
npm run build
cd dist
git add .
git commit -m "Deploy build"
git push origin gh-pages
```
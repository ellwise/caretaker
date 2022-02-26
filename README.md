# Caretaker

## Todo

Game mechanics
- [ ] Make rock more rock-like (deform vertices, maybe join tris into quads)
- [ ] Attach coral (coloured sphere) to empty selected face
- [ ] Place selected coral into an inventory
- [ ] Breed coral onto an empty face
- [ ] Bleach and kill coral over time
- [ ] Add a scoring mechanism

Visuals
- [ ] Zoom in and out from selected/deselected face
- [ ] Water effect
- [ ] Day/night and longer passage of time
- [ ] Complex coral shapes

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
7. Add the a worktree attached to the dist folder and gh-pages branch
8. Never delete the dist folder (just its contents), otherwise you'll need to repeat the previous step

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
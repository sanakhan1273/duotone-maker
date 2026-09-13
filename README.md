# Duotone Press

A browser-based two-ink image processor. Drop in a photo, crush it to two colours with grain and a halftone dither, export a PNG. Built for making gig posters and flyers.

No dependencies, no build step, no server. Everything runs on the client — images never leave the machine.

## Running it locally

Because the page loads `styles.css` and `app.js` as separate files, opening `index.html` directly from the filesystem works in most browsers but can trip CORS rules in some. The reliable way:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Create a repo and push these four files to the root of the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, pick **Deploy from a branch**. Set branch to `main` and folder to `/ (root)`. Save.
4. Wait a minute, then load `https://<your-username>.github.io/<repo-name>/`.

There's no build, so nothing else is needed — Pages serves the files as-is. Pushing to `main` redeploys automatically.

## Customizing

**Colours and spacing.** Everything visual comes from the variable block at the top of `styles.css`. Change the five colour values and the whole interface reskins. There's a commented-out dark theme in there you can swap in by uncommenting it.

**Ink presets.** The `PRESETS` array at the top of `app.js` drives the chips. Add an object with a `name`, a shadow colour `s`, and a highlight colour `h`, and a new chip appears — no HTML edit needed.

**Export resolution.** `MAX_EDGE` in `app.js` caps the longest edge of the working canvas at 1800px. Raise it for print-resolution exports; the effect is a per-pixel loop, so large values will make the sliders feel sluggish.

**Corner softness.** Set `--radius` in `styles.css` to something like `4px` if the hard-edged look isn't what you want.

## How the effect works

Each pixel's luminance is computed once on load, then per render:

1. Optionally inverted.
2. Noise added from a fixed field, so adjusting sliders doesn't reshuffle the grain.
3. Passed through a linear curve steepened around an adjustable midpoint — high contrast values collapse this toward a hard threshold.
4. Optionally dithered with a 4×4 Bayer matrix, applied only to the mid-tone band so flat areas stay clean.
5. Used to mix between the two ink colours.

## License

MIT.

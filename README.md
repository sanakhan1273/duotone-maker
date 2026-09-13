# Duotone Press

Turns a photo into a two-color image with grain and a halftone dither, then exports it as a PNG. I built it for making gig posters and flyers. It runs in the browser. There's no build step and no server, and images are never uploaded anywhere. 

## Customizing

Colors and spacing are set by the variable block at the top of `styles.css`. Changing the five color values reskins the whole interface. There's a dark theme in there too, commented out.

Ink presets come from the `PRESETS` array at the top of `app.js`. Each entry needs a `name`, a shadow color `s`, and a highlight colour `h`. Adding one adds a chip; you don't have to touch the HTML.

`MAX_EDGE` in `app.js` caps the longest edge of the working canvas at 1800px. Raise it for print resolution. The effect runs as a per-pixel loop, so the sliders get laggy at large values.

If you don't want the hard-edged look, set `--radius` in `styles.css` to something like `4px`.

## How the effect works

Luminance is computed once per pixel when the image loads. On each render, that value is:

1. Inverted, if invert is on.
2. Offset by noise from a fixed field, so moving a slider doesn't reshuffle the grain.
3. Run through a linear curve steepened around an adjustable midpoint. At high contrast this collapses toward a hard threshold.
4. Dithered with a 4×4 Bayer matrix, if dither is on. Only the mid-tone band is dithered, so flat areas stay clean.
5. Used to mix the two ink colours.

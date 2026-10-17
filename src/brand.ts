// The brand, as values for code that cannot use the CSS tokens (canvases,
// generated images, meta tags). Keep it in step with tokens.css.

export const palette = {
  /** The main color: highlights, primary actions, "working". */
  yellow: "#ffff5d",
  /** The yellow on light backgrounds. */
  lime: "#eaff81",
  /** Contrast: packets of activity, attention, errors. */
  pink: "#ff00d8",
  /** Waiting, links on dark, calm states. */
  blue: "#007eff",
  blackish: "#171717",
  whiteish: "#fafafa",
} as const;

/** The mark: two slanted bars on a rounded blackish square (32×32). */
export const mark = {
  viewBox: "0 0 32 32",
  radius: 8,
  background: palette.blackish,
  foreground: palette.yellow,
  /** The bars. */
  path: "M7 22.5 L15 9.5 h4 L11 22.5z M14 22.5 L22 9.5 h4 L18 22.5z",
} as const;

/** The mark as an SVG document (for favicons and generated pages). */
export function markSvg(size = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${mark.viewBox}"><rect width="32" height="32" rx="${mark.radius}" fill="${mark.background}"/><rect x="0.5" y="0.5" width="31" height="31" rx="${mark.radius - 0.5}" fill="none" stroke="rgb(250 250 250 / 0.12)"/><path d="${mark.path}" fill="${mark.foreground}"/></svg>`;
}

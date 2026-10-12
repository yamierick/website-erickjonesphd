/**
 * Math for the worked-example pages, rendered to HTML at build time by KaTeX,
 * so the reader's browser runs no script and downloads only the stylesheet and
 * fonts. A typo in the TeX fails the build rather than printing raw source.
 *
 *   t`x_1 + x_2`        inline
 *   d`\max z = 40x_1`   display (its own centred line)
 *
 * Tagged templates use String.raw, so backslashes need no escaping.
 */
import katex from "katex";

const render = (src, displayMode) =>
  katex.renderToString(src, { displayMode, throwOnError: true, strict: "error" });

export const t = (s, ...v) => render(String.raw(s, ...v), false);
export const d = (s, ...v) => render(String.raw(s, ...v), true);

/**
 * Render an executed Jupyter notebook (built by notebooks/build.py) into blocks
 * for src/pages/resources/[slug].astro, at build time.
 *
 * - Markdown cells go through remark/rehype, with $...$ and $$...$$ rendered by
 *   KaTeX first (a math typo fails the build, as in src/lib/tex.js). A dollar
 *   amount is written \$40 in a lesson, as Jupyter itself expects.
 * - Code cells are returned as source for Astro's <Code> (Shiki). The `# alt:`
 *   line that build.py requires on a figure cell becomes the image's alt text
 *   and is not shown in the code.
 * - Long outputs are cut to their head and tail with a note of how much was
 *   left out, so one verbose cell cannot bury the page; the downloadable
 *   notebook keeps every line.
 */
import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

const ROOT = path.join(process.cwd(), "public", "resources");
export const MAX_LINES = 20, HEAD = 12, TAIL = 4, MAX_ROWS = 14;

export function notebookSlugs() {
  return fs.readdirSync(ROOT).filter((s) => fs.existsSync(path.join(ROOT, s, `${s}.ipynb`)));
}

export function loadNotebook(slug) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, slug, `${slug}.ipynb`), "utf8"));
}

const text = (v) => (Array.isArray(v) ? v.join("") : v ?? "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const md = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeStringify);

export function markdown(src) {
  const math = [];
  const keep = (tex, display) => {
    math.push(katex.renderToString(tex.trim(), { displayMode: display, throwOnError: true, strict: "error" }));
    return `KATEXSLOT${math.length - 1}END`;
  };
  let s = src.replace(/\\\$/g, "DOLLARSIGN");
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => `\n\n${keep(t, true)}\n\n`);
  // Inline math as pandoc reads it: no space inside the dollars, no digit straight after the closing one.
  s = s.replace(/\$(?=\S)((?:[^$\\\n]|\\.)+?)(?<=\S)\$(?!\d)/g, (_, t) => keep(t, false));
  let html = String(md.processSync(s));
  html = html.replace(/<p>KATEXSLOT(\d+)END<\/p>/g, (_, i) => math[+i]).replace(/KATEXSLOT(\d+)END/g, (_, i) => math[+i]);
  return html.replace(/DOLLARSIGN/g, "$");
}

function cutLines(s) {
  const lines = s.replace(/\n$/, "").split("\n");
  if (lines.length <= MAX_LINES) return esc(lines.join("\n"));
  const hidden = lines.length - HEAD - TAIL;
  return esc(lines.slice(0, HEAD).join("\n")) +
    `\n<span class="nb-cut">… ${hidden.toLocaleString("en-US")} more lines (all of them are in the notebook) …</span>\n` +
    esc(lines.slice(-TAIL).join("\n"));
}

function cutTable(html) {
  const clean = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/ border="1"/g, "").replace(/ style="[^"]*"/g, "");
  return clean.replace(/<tbody>([\s\S]*?)<\/tbody>/, (all, body) => {
    const rows = body.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
    if (rows.length <= MAX_ROWS) return all;
    const cols = (rows[0].match(/<t[hd]/g) ?? []).length;
    const gap = `<tr class="nb-cut"><td colspan="${cols}">… ${rows.length - 12} more rows …</td></tr>`;
    return `<tbody>${rows.slice(0, 10).join("")}${gap}${rows.slice(-2).join("")}</tbody>`;
  });
}

/** Notebook -> [{kind: "md"|"code"|"out"|"img", ...}] in reading order. */
export function blocks(nb, slug) {
  const out = [];
  nb.cells.forEach((cell, i) => {
    const src = text(cell.source);
    if (cell.cell_type === "markdown") {
      out.push({ kind: "md", html: markdown(src) });
      return;
    }
    const alt = (src.match(/^# alt: (.+)$/m) ?? [])[1] ?? "";
    const code = src.replace(/^# alt: .+$\n?/m, "").trimEnd();
    out.push({ kind: "code", code });
    const pngs = (cell.outputs ?? []).filter((o) => o.data?.["image/png"]).length;
    let k = 0;
    for (const o of cell.outputs ?? []) {
      if (o.output_type === "stream") out.push({ kind: "out", html: cutLines(text(o.text)) });
      else if (o.data?.["image/png"]) {
        const name = pngs === 1 ? `fig-${i}.png` : `fig-${i}-${k++}.png`;
        out.push({ kind: "img", src: `/resources/${slug}/${name}`, alt });
      } else if (o.data?.["text/html"] && text(o.data["text/html"]).includes("<table")) {
        out.push({ kind: "table", html: cutTable(text(o.data["text/html"])) });
      } else if (o.data?.["text/plain"]) out.push({ kind: "out", html: cutLines(text(o.data["text/plain"])) });
    }
  });
  // Merge consecutive outputs of one cell (stdout printed in pieces) into one box.
  return out.reduce((acc, b) => {
    const last = acc[acc.length - 1];
    if (b.kind === "out" && last?.kind === "out") last.html += "\n" + b.html;
    else acc.push(b);
    return acc;
  }, []);
}

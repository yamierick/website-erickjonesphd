"""Build the Python worked examples under /resources/ from their sources here.

Each lesson is one file, notebooks/<slug>.py, in the "percent" format (cells marked
`# %%` and `# %% [markdown]`), so a diff of a lesson reads like a diff of code. This
script turns it into a notebook, runs it top to bottom, and writes the executed
notebook to public/resources/<slug>/<slug>.ipynb, which is both the download on the
page and the thing src/pages/resources/[slug].astro renders. Figures are also saved
beside it as fig-<cell>.png so the page does not inline them.

    python notebooks/build.py                 every lesson
    python notebooks/build.py lp-algorithms   one or more by slug

A lesson may give an R twin under any Python code cell (see parse()). It is then
also built as <slug>-r.ipynb on the IRkernel ("ir") kernel, and the page offers
Python, R, or both side by side (Jones, 2026-10-12, for IE 3301).

It refuses to write a notebook when:
- any cell raises (the error would otherwise be published as output), or writes
  to stderr (a warning would be);
- a cell draws a figure without an `# alt:` line saying what the figure shows;
- an output carries anything that identifies this machine or its licence.

Gurobi runs on the size-limited licence that ships with `pip install gurobipy`:
the home folder is pointed at an empty directory, so the academic licence file is
not found. A lesson that outgrows the free licence therefore fails here, not in a
student's hands, and the licence banner in the output is the one students will see.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import nbformat
from nbclient import NotebookClient

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
OUT = SITE / "public" / "resources"

# Strings that must never reach a published output: this machine's paths, the
# academic licence's banner and identifiers, and the owner's university address.
FORBIDDEN = ["jonesec", "OneDrive", "Academic license", "LicenseID", "gurobi.lic", "uta.edu", "C:\\Users", "C:/Users"]


def parse(path: Path):
    """Percent-format source -> (page metadata, cells in source order).

    Cell markers:
        # %% [markdown]       prose shown in every language
        # %% [markdown py]    prose for the Python version only
        # %% [markdown r]     prose for the R version only
        # %%                  Python code
        # %% [r]              the R twin of the Python cell just above it; its lines
                              are written "# "-prefixed so this file stays valid Python
    Each cell keeps its position as `step`, which pairs a twin with its Python cell
    and names its figures (fig-<step>.png), so both notebooks share one numbering.
    """
    text = path.read_text(encoding="utf-8")
    meta, body = {}, text
    m = re.match(r"# ---\n(.*?)\n# ---\n", text, flags=re.S)
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line[2:].partition(":")
            meta[k.strip()] = v.strip()
        body = text[m.end():]
    for need in ("title", "description"):
        if need not in meta:
            raise SystemExit(f"{path.name}: header needs '{need}'")
    unprefix = lambda src: "\n".join(ln[2:] if ln.startswith("# ") else ln.lstrip("#") for ln in src.splitlines()).strip()
    cells = []
    parts = re.split(r"^# %%(.*)$", body, flags=re.M)
    for step, (tag, src) in enumerate(zip(parts[1::2], parts[2::2])):
        src, tag = src.strip("\n"), tag.strip()
        if tag.startswith("[markdown"):
            lang = {"[markdown]": "both", "[markdown py]": "py", "[markdown r]": "r"}[tag]
            cells.append({"kind": "markdown", "lang": lang, "src": unprefix(src), "step": step})
        elif tag == "[r]":
            prev = cells[-1] if cells else None
            if not prev or prev["kind"] != "code" or prev["lang"] != "py":
                raise SystemExit(f"{path.name}: an [r] cell must follow a Python code cell (step {step})")
            cells.append({"kind": "code", "lang": "r", "src": unprefix(src), "step": step, "twin": prev["step"]})
        elif tag == "":
            cells.append({"kind": "code", "lang": "py", "src": src, "step": step})
        else:
            raise SystemExit(f"{path.name}: unknown cell marker '# %% {tag}'")
    return meta, cells


KERNELS = {
    "py": ({"name": "python3", "display_name": "Python 3", "language": "python"}, {"name": "python"}),
    "r": ({"name": "ir", "display_name": "R", "language": "R"}, {"name": "R"}),
}


def notebook(meta, cells, lang) -> nbformat.NotebookNode:
    """The notebook for one language: its code, plus the prose for all or for it."""
    nb = nbformat.v4.new_notebook()
    for c in cells:
        if c["lang"] not in ("both", lang):
            continue
        cell = (nbformat.v4.new_markdown_cell if c["kind"] == "markdown" else nbformat.v4.new_code_cell)(c["src"])
        cell.metadata["step"] = c["step"]
        if "twin" in c:
            cell.metadata["twin"] = c["twin"]
        nb.cells.append(cell)
    nb.metadata["page"] = {**meta, "lang": lang}
    nb.metadata["kernelspec"], nb.metadata["language_info"] = KERNELS[lang]
    return nb


def free_licence_env() -> Path:
    """Point HOME at an empty folder so Gurobi falls back to the pip licence."""
    home = Path(tempfile.mkdtemp(prefix="nbhome-"))
    os.environ.pop("GRB_LICENSE_FILE", None)
    os.environ["HOME"] = str(home)
    os.environ["USERPROFILE"] = str(home)
    os.environ["HOMEDRIVE"], os.environ["HOMEPATH"] = home.drive, str(home)[len(home.drive):]
    # A fixed folder, so matplotlib's one-time font-cache notice is not printed into a lesson.
    os.environ["MPLCONFIGDIR"] = str(Path(tempfile.gettempdir()) / "nb-mpl")
    os.environ["PYTHONIOENCODING"] = "utf-8"
    return home


def outputs_text(cell) -> str:
    s = []
    for o in cell.get("outputs", []):
        if "text" in o:
            s.append(o["text"])
        for k, v in o.get("data", {}).items():
            if k.startswith("text/"):
                s.append(v if isinstance(v, str) else "".join(v))
    return "\n".join(s)


def run(nb, lang: str, dest: Path, figs: dict, problems: list) -> None:
    """Execute one language's notebook in dest and collect its figures and problems."""
    # Data files a lesson reads sit beside the published notebook, so the download
    # finds them when run from the same folder; run there for the same reason.
    NotebookClient(nb, timeout=600, kernel_name=nb.metadata.kernelspec["name"],
                   resources={"metadata": {"path": str(dest)}}, record_timing=False, allow_errors=False).execute()
    for cell in nb.cells:
        if cell.cell_type != "code":
            continue
        where = f"{lang} step {cell.metadata['step']}"
        cell.metadata.pop("execution", None)
        text = outputs_text(cell)
        for bad in FORBIDDEN:
            if bad.lower() in text.lower():
                problems.append(f"{where}: output contains '{bad}'")
        if any(o.get("name") == "stderr" for o in cell.outputs):
            problems.append(f"{where}: wrote to stderr (a warning or message would be published); fix the cause")
        pngs = [o for o in cell.outputs if "image/png" in o.get("data", {})]
        if pngs and not re.search(r"^# alt: \S", cell.source, flags=re.M):
            problems.append(f"{where}: draws a figure but has no '# alt:' line")
        step = cell.metadata["step"]
        for k, o in enumerate(pngs):
            figs[f"fig-{step}.png" if len(pngs) == 1 else f"fig-{step}-{k}.png"] = base64.b64decode(o["data"]["image/png"])


def build(slug: str) -> None:
    meta, cells = parse(HERE / f"{slug}.py")
    langs = ["py"] + (["r"] if any(c["lang"] == "r" for c in cells) else [])
    dest = OUT / slug
    dest.mkdir(parents=True, exist_ok=True)
    problems, figs, nbs = [], {}, {}
    for lang in langs:
        nbs[lang] = notebook(meta, cells, lang)
        run(nbs[lang], lang, dest, figs, problems)
    if problems:
        raise SystemExit(f"{slug}: not written\n  " + "\n  ".join(problems))
    for old in dest.glob("fig-*.png"):
        old.unlink()
    for name, data in figs.items():
        (dest / name).write_bytes(data)
    # The Python notebook keeps the plain name, so existing download links still work.
    for lang, nb in nbs.items():
        nbformat.write(nb, dest / (f"{slug}.ipynb" if lang == "py" else f"{slug}-r.ipynb"))
    n = {lang: sum(c.cell_type == "code" for c in nb.cells) for lang, nb in nbs.items()}
    print(f"built {slug}: code cells {n}, figures {len(figs)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if sys.platform == "win32":  # zmq warns on Windows' default event loop
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    slugs = sys.argv[1:] or sorted(p.stem for p in HERE.glob("*.py") if p.stem not in ("build", "show"))
    free_licence_env()
    for s in slugs:
        build(s)

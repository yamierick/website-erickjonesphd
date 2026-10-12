"""Build the Python worked examples under /resources/ from their sources here.

Each lesson is one file, notebooks/<slug>.py, in the "percent" format (cells marked
`# %%` and `# %% [markdown]`), so a diff of a lesson reads like a diff of code. This
script turns it into a notebook, runs it top to bottom, and writes the executed
notebook to public/resources/<slug>/<slug>.ipynb, which is both the download on the
page and the thing src/pages/resources/[slug].astro renders. Figures are also saved
beside it as fig-<cell>.png so the page does not inline them.

    python notebooks/build.py                 every lesson
    python notebooks/build.py lp-algorithms   one or more by slug

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


def parse(path: Path) -> nbformat.NotebookNode:
    """Percent-format source -> notebook. The header block becomes page metadata."""
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
    nb = nbformat.v4.new_notebook()
    parts = re.split(r"^# %%(.*)$", body, flags=re.M)
    for tag, src in zip(parts[1::2], parts[2::2]):
        src = src.strip("\n")
        if "[markdown]" in tag:
            lines = [ln[2:] if ln.startswith("# ") else ln.lstrip("#") for ln in src.splitlines()]
            nb.cells.append(nbformat.v4.new_markdown_cell("\n".join(lines).strip()))
        else:
            nb.cells.append(nbformat.v4.new_code_cell(src))
    nb.metadata["page"] = meta
    nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
    nb.metadata["language_info"] = {"name": "python"}
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


def build(slug: str) -> None:
    src = HERE / f"{slug}.py"
    nb = parse(src)
    dest = OUT / slug
    dest.mkdir(parents=True, exist_ok=True)
    # Data files a lesson reads sit beside the published notebook, so the download
    # finds them when run from the same folder; run there for the same reason.
    NotebookClient(nb, timeout=600, kernel_name="python3", resources={"metadata": {"path": str(dest)}},
                   record_timing=False, allow_errors=False).execute()

    problems = []
    for old in dest.glob("fig-*.png"):
        old.unlink()
    for i, cell in enumerate(nb.cells):
        if cell.cell_type != "code":
            continue
        cell.metadata.pop("execution", None)
        text = outputs_text(cell)
        for bad in FORBIDDEN:
            if bad.lower() in text.lower():
                problems.append(f"cell {i}: output contains '{bad}'")
        if any(o.get("name") == "stderr" for o in cell.outputs):
            problems.append(f"cell {i}: wrote to stderr (a warning would be published); fix the cause")
        pngs = [o for o in cell.outputs if "image/png" in o.get("data", {})]
        if pngs and not re.search(r"^# alt: \S", cell.source, flags=re.M):
            problems.append(f"cell {i}: draws a figure but has no '# alt:' line")
        for k, o in enumerate(pngs):
            name = f"fig-{i}.png" if len(pngs) == 1 else f"fig-{i}-{k}.png"
            (dest / name).write_bytes(base64.b64decode(o["data"]["image/png"]))
    if problems:
        raise SystemExit(f"{slug}: not written\n  " + "\n  ".join(problems))
    nbformat.write(nb, dest / f"{slug}.ipynb")
    n_code = sum(c.cell_type == "code" for c in nb.cells)
    print(f"built {slug}: {len(nb.cells)} cells ({n_code} code), figures {len(list(dest.glob('fig-*.png')))}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if sys.platform == "win32":  # zmq warns on Windows' default event loop
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    slugs = sys.argv[1:] or sorted(p.stem for p in HERE.glob("*.py") if p.stem not in ("build", "show"))
    free_licence_env()
    for s in slugs:
        build(s)

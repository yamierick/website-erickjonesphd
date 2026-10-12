"""Check the R and Python cheat sheet (src/data/rpython.json): run each checked row
in both languages and fail if the two numbers differ.

    python notebooks/check_rpython.py

R runs through Rscript (R 4.6.1 here; set RSCRIPT to point elsewhere). A row's
`rcheck`/`pycheck` is evaluated when present, otherwise the code shown on the page.
Random rows are run, to prove they work, but not compared.
"""
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
DATA = json.loads((Path(__file__).resolve().parent.parent / "src" / "data" / "rpython.json").read_text(encoding="utf-8"))
RSCRIPT = os.environ.get("RSCRIPT", r"C:\Program Files\R\R-4.6.1\bin\x64\Rscript.exe")

rows = [(f"{g['title']} / {r['task']}", r) for g in DATA["groups"] for r in g["rows"] if r.get("check")]

# R: one script, one printed number per row.
lines = [DATA["preamble"]["r"]]
for i, (_, r) in enumerate(rows):
    expr = r.get("rcheck", r["r"])
    if r.get("random"):
        lines.append(f"invisible({expr}); cat({i}, 'ran\\n')")
    else:
        lines.append(f"cat({i}, sprintf('%.12g', as.numeric({expr})[1]), '\\n')")
with tempfile.NamedTemporaryFile("w", suffix=".R", delete=False, encoding="utf-8") as f:
    f.write("\n".join(lines))
proc = subprocess.run([RSCRIPT, f.name], capture_output=True, text=True)
os.unlink(f.name)
if proc.returncode or proc.stderr.strip():
    raise SystemExit("R failed or warned:\n" + proc.stderr)
r_vals = {int(k): v for k, v in (ln.split(None, 1) for ln in proc.stdout.splitlines() if ln.strip())}

# Python: the same rows, in this process.
env = {}
exec(DATA["preamble"]["py"], env)
bad = 0
for i, (name, r) in enumerate(rows):
    value = eval(r.get("pycheck", r["py"]), env)
    rv = r_vals.get(i, "missing").strip()
    if r.get("random"):
        ok = rv == "ran"
        print(("ok  " if ok else "FAIL"), f"{name}: runs in both (random, not compared)")
    else:
        pv = float(np.ravel(value)[0])
        ok = rv != "missing" and math.isclose(float(rv), pv, rel_tol=1e-6, abs_tol=1e-9)
        print(("ok  " if ok else "FAIL"), f"{name}: R {rv}  Python {pv:.12g}")
    bad += not ok
print(f"{len(rows) - bad} of {len(rows)} rows agree")
sys.exit(1 if bad else 0)

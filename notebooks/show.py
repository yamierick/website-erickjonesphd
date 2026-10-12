"""Print a built notebook's code outputs as text, to review a lesson without a browser.

    python notebooks/show.py lp-algorithms
    python notebooks/show.py stat-basics r      the R twin
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
slug = sys.argv[1]
name = f"{slug}-r.ipynb" if sys.argv[2:] == ["r"] else f"{slug}.ipynb"
nb = json.loads((Path(__file__).resolve().parent.parent / "public" / "resources" / slug / name).read_text(encoding="utf-8"))
for c in nb["cells"]:
    if c["cell_type"] != "code":
        continue
    first = "".join(c["source"]).splitlines()[0] if c["source"] else ""
    print(f"--- step {c['metadata'].get('step')}: {first[:70]}")
    for o in c.get("outputs", []):
        if "text" in o:
            print("".join(o["text"]).rstrip())
        d = o.get("data", {})
        if "text/plain" in d and "image/png" not in d:
            print("".join(d["text/plain"]).rstrip())
        if "image/png" in d:
            print("[figure]")

"""After `astro build`, look for TeX that escaped KaTeX on the lesson pages:
a dollar sign or a backslash command left in the page's visible prose.

    python notebooks/check_math.py
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DIST = Path(__file__).resolve().parent.parent / "dist" / "resources"


class Prose(HTMLParser):
    """Visible text outside code, outputs and KaTeX's own markup."""
    SKIP = {"pre", "code", "script", "style", "annotation", "math"}

    def __init__(self):
        super().__init__()
        self.depth, self.text = 0, []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class", "") or ""
        if tag in self.SKIP or "katex" in cls.split():
            self.depth += 1

    def handle_endtag(self, tag):
        pass

    def handle_data(self, data):
        if not self.depth:
            self.text.append(data)


bad = 0
for page in sorted(DIST.glob("*/index.html")):
    if not (page.parent / f"{page.parent.name}.ipynb").exists() and page.parent.name != "r-python":
        continue
    html = page.read_text(encoding="utf-8")
    # Strip code, outputs and rendered math before looking at what is left.
    html = re.sub(r"<(pre|script|style)[\s\S]*?</\1>", " ", html)
    html = re.sub(r'<span class="katex(-display)?">[\s\S]*?</span></span></span>', " ", html)
    html = re.sub(r"<code>[\s\S]*?</code>", " ", html)
    text = re.sub(r"<[^>]+>", " ", html)
    hits = re.findall(r".{0,30}(?:\\[a-zA-Z]+|\$[^\s\d]).{0,30}", text)
    for h in hits:
        print(f"{page.parent.name}: …{h.strip()}…")
    bad += len(hits)
print("stray TeX:", bad)
sys.exit(1 if bad else 0)

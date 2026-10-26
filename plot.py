# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib"]
# ///

"""
Read the file in data/, make one picture, save it to out/.

    uv run plot.py

Three parts, and you will replace all three: rows() reads the file the way *your*
file needs reading, the loop in main() picks the numbers out of it, and the plot at
the bottom is the transformation you chose. Print before you plot.
"""

import csv
from pathlib import Path

import matplotlib.pyplot as plt

FILE = "hko-daily-mean-temperature-2026.csv"   # CHANGE ME: the same name as in fetch.py
PICTURE = "plot.png"                           # what goes into out/, and into the README

HERE = Path(__file__).parent
DATA = HERE / "data" / FILE
OUT = HERE / "out"


def rows(path):
    """The file as a list of lists, one per line. The Observatory puts three lines
    of titles above the table and a legend below it, so keep only the lines that
    start with a year."""
    kept = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for line in csv.reader(handle):
            if line and line[0].isdigit():
                kept.append(line)
    return kept


def main():
    table = rows(DATA)
    print(f"{DATA.name}: {len(table)} rows. The first one: {table[0]}")

    days, values = [], []
    for i, (year, month, day, value, quality) in enumerate(table):   # the loop over the numbers
        if value == "***":                   # the Observatory's word for "missing"
            continue
        days.append(i + 1)
        values.append(float(value))          # it arrived as text; make it a number
    print(f"{len(values)} values, from {min(values)} to {max(values)}")

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(days, values, color="#d6591d", linewidth=1.5)
    ax.set_xlabel("day of 2026")
    ax.set_ylabel("daily mean temperature, °C")
    ax.set_title("Hong Kong Observatory, 2026 so far")
    fig.tight_layout()

    OUT.mkdir(exist_ok=True)
    fig.savefig(OUT / PICTURE, dpi=150)
    print(f"saved out/{PICTURE}")
    plt.show()


if __name__ == "__main__":
    main()

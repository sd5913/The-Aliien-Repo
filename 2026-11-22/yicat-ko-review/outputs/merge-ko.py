#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 YiCAT 导出的韩语译文回并到 ko-KR.ts（默认只预览，不改文件）。

支持输入：
  - YiCAT「多语 Excel」导出的 .xlsx（含 key 列与 ko-KR 列）
  - YiCAT 导出的 .xliff / .xlf（优先用 trans-unit/@resname 作为 key）

安全规则：
  - 只更新 ko-KR.ts，绝不触碰 zh-CN.ts / en.ts
  - 只按 key 回并；key 不在词条表中时忽略并报告
  - 占位符集合必须与中文原文完全一致，否则跳过该条并报错
  - 保留原有行序、缩进、逗号、行尾符；未变化的行保持字节级不变

用法：
  python merge-ko.py --input exported.xlsx            # 预览
  python merge-ko.py --input exported.xlsx --write    # 实际写入
  python merge-ko.py --input exported.xliff --write
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

PH = re.compile(r"\{(\w+)\}")
LINE = re.compile(
    r'^([ \t]*)"((?:[^"\\]|\\.)*)"([ \t]*:[ \t]*)"((?:[^"\\]|\\.)*)"(.*)$', re.M
)

UNESCAPE = {
    "n": "\n",
    "t": "\t",
    "r": "\r",
    "b": "\b",
    "f": "\f",
    '"': '"',
    "'": "'",
    "\\": "\\",
    "/": "/",
}


def js_unescape(text: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "\\" and i + 1 < len(text):
            nxt = text[i + 1]
            if nxt in UNESCAPE:
                out.append(UNESCAPE[nxt])
                i += 2
                continue
            if nxt == "u" and i + 5 < len(text):
                out.append(chr(int(text[i + 2 : i + 6], 16)))
                i += 6
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def js_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


def placeholders(text: str) -> list[str]:
    return sorted(set(PH.findall(text or "")))


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text or "")).strip()


def find_repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [Path.cwd(), here.parent, *here.parents]:
        candidate = parent / "src" / "i18n" / "messages" / "ko-KR.ts"
        if candidate.exists():
            return parent
    raise SystemExit("找不到 src/i18n/messages/ko-KR.ts，请用 --ts 指定")


def load_catalog(path: Path) -> tuple[str, list[str], dict[str, str]]:
    with open(path, "r", encoding="utf-8", newline="") as handle:
        text = handle.read()
    order: list[str] = []
    values: dict[str, str] = {}
    for m in LINE.finditer(text):
        key = js_unescape(m.group(2))
        order.append(key)
        values[key] = js_unescape(m.group(4))
    if not order:
        raise SystemExit(f"{path} 中没有解析到词条")
    return text, order, values


def load_xlsx(path: Path, known: set[str]) -> dict[str, str]:
    from openpyxl import load_workbook

    wb = load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header_idx = None
    for i, row in enumerate(rows[:5]):
        if any(isinstance(c, str) and c.strip().lower() == "key" for c in row):
            header_idx = i
            break

    if header_idx is None:
        key_col, ko_col = 0, 2
    else:
        header = [str(c or "") for c in rows[header_idx]]
        key_col = next(i for i, c in enumerate(header) if c.strip().lower() == "key")
        ko_col = next(
            (i for i, c in enumerate(header) if "ko" in c.lower() or "韩" in c), key_col + 2
        )

    out: dict[str, str] = {}
    for row in rows[header_idx + 1 :] if header_idx is not None else rows:
        if key_col >= len(row):
            continue
        key = row[key_col]
        if not isinstance(key, str) or key.strip() not in known:
            continue
        value = row[ko_col] if ko_col < len(row) else None
        out[key.strip()] = "" if value is None else str(value)
    return out


def inner_text(element) -> str:
    return "".join(element.itertext()) if element is not None else ""


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def load_xliff(
    path: Path, known: set[str], order: list[str], source: dict[str, str]
) -> dict[str, str]:
    tree = ET.parse(path)
    units = [e for e in tree.iter() if local_name(e.tag) == "trans-unit"]
    out: dict[str, str] = {}
    used: set[str] = set()
    by_source: dict[str, list[str]] = {}
    for key in order:
        by_source.setdefault(norm(source[key]), []).append(key)

    for index, unit in enumerate(units):
        src_el = tgt_el = None
        for child in unit:
            name = local_name(child.tag)
            if name == "source":
                src_el = child
            elif name == "target":
                tgt_el = child
        src_text = inner_text(src_el)
        tgt_text = inner_text(tgt_el)

        key = unit.get("resname") or unit.get("id") or ""
        if key not in known or key in used:
            key = ""
            candidates = by_source.get(norm(src_text), [])
            if len(candidates) == 1 and candidates[0] not in used:
                key = candidates[0]
            elif index < len(order):
                guess = order[index]
                if guess not in used and norm(source[guess]) == norm(src_text):
                    key = guess
        if not key:
            print(f"[跳过] 无法匹配句段：{src_text[:40]!r}")
            continue
        used.add(key)
        out[key] = tgt_text
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="把 YiCAT 导出译文回并到 ko-KR.ts")
    parser.add_argument("--input", required=True, type=Path, help="导出的 .xlsx 或 .xliff")
    parser.add_argument("--ts", type=Path, help="目标 ko-KR.ts（默认自动定位）")
    parser.add_argument("--write", action="store_true", help="实际写入；默认只预览")
    parser.add_argument(
        "--allow-identical", action="store_true", help="允许译文与中文原文完全相同"
    )
    parser.add_argument("--report", type=Path, help="把统计结果写成 JSON")
    args = parser.parse_args()

    repo_root = find_repo_root()
    ts_path = args.ts or (repo_root / "src" / "i18n" / "messages" / "ko-KR.ts")
    text, order, current = load_catalog(ts_path)
    known = set(order)

    zh_path = repo_root / "src" / "i18n" / "messages" / "zh-CN.ts"
    _, _, source = load_catalog(zh_path)

    suffix = args.input.suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        exported = load_xlsx(args.input, known)
    elif suffix in {".xliff", ".xlf"}:
        exported = load_xliff(args.input, known, order, source)
    else:
        raise SystemExit("只支持 .xlsx / .xliff / .xlf")

    updates: dict[str, str] = {}
    errors: list[str] = []
    warnings: list[str] = []
    unchanged: list[str] = []

    for key in order:
        if key not in exported:
            continue
        target = exported[key].strip()
        if not target:
            errors.append(f"{key}: 导出结果为空，已保留旧译文")
            continue
        if placeholders(source.get(key, "")) != placeholders(target):
            errors.append(
                f"{key}: 占位符不一致 原文={placeholders(source.get(key, ''))} 译文={placeholders(target)}"
            )
            continue
        if target == source.get(key, ""):
            if not args.allow_identical:
                errors.append(f"{key}: 译文与中文原文相同，疑似未翻译")
                continue
            warnings.append(f"{key}: 译文与中文原文相同（已允许）")
        if target == current.get(key, ""):
            unchanged.append(key)
            continue
        updates[key] = target

    written = 0
    new_text = text
    if updates:
        def repl(m: re.Match[str]) -> str:
            nonlocal written
            indent, key_raw, sep, _value, tail = m.groups()
            key = js_unescape(key_raw)
            if key not in updates:
                return m.group(0)
            written += 1
            return f'{indent}"{key_raw}"{sep}"{js_escape(updates[key])}"{tail}'

        new_text = LINE.sub(repl, text)

    missing = [k for k in order if k not in exported]
    extra = [k for k in exported if k not in known]

    print(f"词条总数        : {len(order)}")
    print(f"导出中匹配到的 key: {len(exported)}")
    print(f"将有变化的行    : {len(updates)}")
    print(f"与当前文件相同  : {len(unchanged)}")
    print(f"导出中缺少的 key: {len(missing)}")
    print(f"导出中多余的 key: {len(extra)}")
    print(f"错误（已跳过）  : {len(errors)}")
    if missing:
        print("\n缺少的 key（前 20 个）：")
        for key in missing[:20]:
            print("  -", key)
    if errors:
        print("\n错误：")
        for item in errors[:50]:
            print("  -", item)
        if len(errors) > 50:
            print(f"  ... 另有 {len(errors) - 50} 条")
    if warnings:
        print("\n警告：")
        for item in warnings[:20]:
            print("  -", item)

    if updates:
        diff = list(
            difflib.unified_diff(
                text.splitlines(),
                new_text.splitlines(),
                fromfile=str(ts_path),
                tofile=str(ts_path) + " (merged)",
                n=0,
                lineterm="",
            )
        )
        print("\n差异预览（前 40 行）：")
        for line in diff[:40]:
            print(line)
        if len(diff) > 40:
            print(f"... 共 {len(diff)} 行差异")

    if args.report:
        args.report.write_text(
            json.dumps(
                {
                    "total": len(order),
                    "matched": len(exported),
                    "updated": len(updates),
                    "unchanged": len(unchanged),
                    "missing": missing,
                    "extra": extra,
                    "errors": errors,
                    "warnings": warnings,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    if args.write:
        if written != len(updates):
            print(f"\n[中止] 预期改写 {len(updates)} 行，实际 {written} 行", file=sys.stderr)
            return 1
        tmp = ts_path.with_suffix(ts_path.suffix + ".tmp")
        with open(tmp, "w", encoding="utf-8", newline="") as handle:
            handle.write(new_text)
        os.replace(tmp, ts_path)
        print(f"\n已写入 {ts_path}（{written} 行）")
    else:
        print("\n预览模式，未写入。确认无误后加 --write。")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

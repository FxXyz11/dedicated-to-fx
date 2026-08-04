#!/usr/bin/env python3
"""Build compact, first-two-letter dictionary shards from ECDICT.

The generated files are static content. The web app downloads a shard only when
it needs a word with that prefix, so the complete dictionary is not loaded into
memory on phones.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


WORD_PATTERN = re.compile(r"[a-z]+(?:[’'-][a-z]+)*")
NOISE_PREFIXES = ("[网络]", "[网]", "[例句]")


def positive_number(value: str) -> bool:
    try:
        return int(value or "0") > 0
    except ValueError:
        return False


def is_learning_entry(row: dict[str, str]) -> bool:
    word = row["word"].strip().lower()
    if not WORD_PATTERN.fullmatch(word):
        return False
    if not (row["definition"].strip() or row["translation"].strip()):
        return False
    return bool(
        row["tag"].strip()
        or positive_number(row["collins"])
        or positive_number(row["oxford"])
        or positive_number(row["bnc"])
        or positive_number(row["frq"])
    )


def clean_lines(value: str, limit: int) -> str:
    lines: list[str] = []
    normalized = value.replace("\\r", "").replace("\\n", "\n").replace("\r", "")
    for raw_line in normalized.split("\n"):
        line = " ".join(raw_line.split()).strip()
        if not line or line.startswith(NOISE_PREFIXES):
            continue
        if line not in lines:
            lines.append(line)
        if len(lines) == limit:
            break
    return "\n".join(lines)


def compact_entry(row: dict[str, str]) -> list[str]:
    return [
        row["word"].strip().lower(),
        row["phonetic"].strip(),
        clean_lines(row["definition"], 4),
        clean_lines(row["translation"], 6),
        row["pos"].strip(),
        row["exchange"].strip(),
    ]


def shard_key(word: str) -> str:
    letters = "".join(character for character in word.lower() if character.isalpha())
    return (letters + "_")[:2] if letters else "__"


def build(source: Path, output: Path, analyze_only: bool) -> None:
    shards: dict[str, list[list[str]]] = defaultdict(list)
    total = 0
    kept = 0
    estimated_bytes = 0

    with source.open("r", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            total += 1
            if not is_learning_entry(row):
                continue
            entry = compact_entry(row)
            if not (entry[2] or entry[3]):
                continue
            kept += 1
            estimated_bytes += len(
                json.dumps(entry, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            ) + 1
            shards[shard_key(entry[0])].append(entry)

    summary = {
        "sourceRows": total,
        "includedEntries": kept,
        "estimatedBytes": estimated_bytes,
        "shardCount": len(shards),
        "largestShards": Counter({key: len(value) for key, value in shards.items()}).most_common(12),
    }
    print(json.dumps(summary, ensure_ascii=True))
    if analyze_only:
        return

    output.mkdir(parents=True, exist_ok=True)
    for old_file in output.glob("*.json"):
        old_file.unlink()
    for key, entries in shards.items():
        entries.sort(key=lambda entry: entry[0])
        payload = {"v": 1, "entries": entries}
        (output / f"{key}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    (output / "manifest.json").write_text(
        json.dumps(
            {
                "version": 1,
                "entryCount": kept,
                "shardCount": len(shards),
                "source": "ECDICT",
                "license": "MIT",
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/dictionary"))
    parser.add_argument("--analyze-only", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    build(arguments.source, arguments.output, arguments.analyze_only)

#!/usr/bin/env python3
"""Which suites does this pull request need? Prints `<group>=true|false` lines (for $GITHUB_OUTPUT) from tools/ci/path_groups.json.

  changed_paths.py --event pull_request --base <sha> --head <sha>

A pull request runs a group only when a changed file matches it. Every other event (push, schedule, manual) runs every group, and so
does a pull request whose changed files cannot be listed (never a silent skip). Skipped jobs report success, so required checks still pass.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def glob_to_regex(pattern: str) -> "re.Pattern[str]":
    out, i = "", 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out += "(?:.*/)?"; i += 3
        elif pattern.startswith("**", i):
            out += ".*"; i += 2
        elif pattern[i] == "*":
            out += "[^/]*"; i += 1
        elif pattern[i] == "?":
            out += "[^/]"; i += 1
        else:
            out += re.escape(pattern[i]); i += 1
    return re.compile("^" + out + "$")


def load_groups(path: str = os.path.join(HERE, "path_groups.json")) -> dict:
    with open(path, encoding="utf8") as f:
        return json.load(f)["groups"]


def decide(groups: dict, files: "list[str] | None", event: str) -> dict:
    """files None = could not be listed. Returns {group: bool}."""
    if event != "pull_request" or files is None:
        return {g: True for g in groups}
    return {g: any(glob_to_regex(p).match(f) for f in files for p in pats) for g, pats in groups.items()}


def changed_files(base: str, head: str) -> "list[str] | None":
    try:
        out = subprocess.run(["git", "diff", "--name-only", f"{base}...{head}"], check=True, capture_output=True, text=True).stdout
    except Exception:
        try:
            out = subprocess.run(["git", "diff", "--name-only", base, head], check=True, capture_output=True, text=True).stdout
        except Exception:
            return None
    return [l for l in out.splitlines() if l]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--event", default=os.environ.get("GITHUB_EVENT_NAME", ""))
    ap.add_argument("--base", default="")
    ap.add_argument("--head", default="")
    a = ap.parse_args(argv)
    groups = load_groups()
    files = changed_files(a.base, a.head) if a.event == "pull_request" and a.base and a.head else None
    result = decide(groups, files, a.event)
    for g, v in result.items():
        print(f"{g}={'true' if v else 'false'}")
    print(f"changed files: {len(files) if files is not None else 'unknown (running everything)'}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

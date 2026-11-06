#!/usr/bin/env python3
"""Run every non-browser repository test and retain each command's outcome."""
import argparse
import json
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
tests = [p for p in sorted(Path('tests').iterdir())
         if p.suffix in ('.mjs', '.cjs', '.py') and p.name != 'browser-smoke.test.mjs']
if not tests:
    raise SystemExit('No non-browser tests discovered')
results = []
for path in tests:
    command = ['python3' if path.suffix == '.py' else 'node', str(path)]
    started = time.monotonic()
    try:
        run = subprocess.run(command, capture_output=True, text=True, timeout=120)
        code, stdout, stderr = run.returncode, run.stdout, run.stderr
    except subprocess.TimeoutExpired as error:
        code, stdout, stderr = 124, str(error.stdout or ''), str(error.stderr or '')
    result = dict(test=path.name, command=command, exit_code=code,
                  seconds=round(time.monotonic() - started, 3), stdout=stdout, stderr=stderr)
    results.append(result)
    (args.output / (path.name + '.log')).write_text(stdout + stderr)
    print(f'{path.name}: {"PASS" if code == 0 else "FAIL"} (exit {code})', flush=True)
(args.output / 'non-browser-tests.json').write_text(json.dumps(results, indent=2))
failed = sum(row['exit_code'] != 0 for row in results)
print(f'{len(results) - failed}/{len(results)} test scripts passed; {failed} failed')
raise SystemExit(1 if failed else 0)

#!/usr/bin/env python3
"""Run the unchanged browser smoke test in fresh browser storage; preserve failure."""
import argparse
import json
from pathlib import Path
import subprocess
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
with (args.output / 'server.log').open('w') as server_log:
    server = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--bind', '127.0.0.1'],
                              stdout=server_log, stderr=subprocess.STDOUT)
    try:
        # Only loopback traffic avoids the outbound proxy. External requests keep it.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError('Local test server exited')
            try:
                with opener.open('http://127.0.0.1:8765/index.html', timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.05)
        else:
            raise RuntimeError('Local test server did not become ready')
        with (args.output / 'browser.log').open('w') as log:
            command = ['node', '--import', './scripts/ci-browser-preload.mjs',
                       'tests/browser-smoke.test.mjs']
            try:
                run = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=240)
                code = run.returncode
            except subprocess.TimeoutExpired:
                code = 124
        (args.output / 'browser-result.json').write_text(json.dumps({
            'command': command, 'exit_code': code, 'test_source_unchanged': True,
        }, indent=2))
        print((args.output / 'browser.log').read_text(), end='')
    finally:
        server.terminate()
        server.wait(timeout=10)
raise SystemExit(code)

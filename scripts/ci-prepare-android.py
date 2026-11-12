#!/usr/bin/env python3
"""Reuse only the existing CI preparation steps, never its publication steps."""
from pathlib import Path
import subprocess
import yaml

if Path('android').exists() or Path('www').exists():
    raise SystemExit('Use a fresh build directory; refusing to overwrite android/ or www/')
workflow = yaml.safe_load(Path('.github/workflows/build-apk.yml').read_text())
steps = [step for job in workflow['jobs'].values() for step in job['steps']]
names = [
    'Collect web files and integrate Maya V18 modules',
    'Create Android project',
    'Add Maya native features',
    'Install consent-based screenshot and launcher visibility',
    'Add permissions (microphone, camera)',
    'Sync web files into the app',
    'Replace Android launcher icon with new Maya artwork',
]
for name in names:
    matches = [step for step in steps if step.get('name') == name]
    if len(matches) != 1 or 'run' not in matches[0]:
        raise SystemExit(f'Expected exactly one existing CI preparation step: {name}')
    print(name, flush=True)
    subprocess.run(['bash', '-euo', 'pipefail', '-c', matches[0]['run']], check=True)

#!/usr/bin/env python3
"""Verify and package the built APK with its exact source commit and checksum."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--apk', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
expected = os.environ.get('MAYA_BUILD_COMMIT', commit)
if commit != expected:
    raise SystemExit(f'Checkout {commit} does not match requested build commit {expected}')
signer = Path(os.environ['ANDROID_HOME']) / 'build-tools/34.0.0/apksigner'
verification = subprocess.run([str(signer), 'verify', '--verbose', '--print-certs', str(args.apk)],
                              capture_output=True, text=True)
args.output.mkdir(parents=True, exist_ok=True)
(args.output / 'APK-SIGNATURE.txt').write_text(verification.stdout + verification.stderr)
verification.check_returncode()
features = [path for path in Path('maya-features').rglob('*') if path.is_file()]
with zipfile.ZipFile(args.apk) as apk:
    if apk.testzip() is not None:
        raise SystemExit('APK ZIP integrity check failed')
    if apk.read('assets/public/index.html') != Path('www/index.html').read_bytes():
        raise SystemExit('APK HTML does not match prepared web assets')
    for path in features + [Path('maya-v18-runtime.js')]:
        if apk.read('assets/public/' + path.as_posix()) != path.read_bytes():
            raise SystemExit(f'APK asset differs from source: {path}')
destination = args.output / 'app-debug.apk'
if args.apk.resolve() != destination.resolve():
    shutil.copy2(args.apk, destination)
digest = hashlib.sha256(destination.read_bytes()).hexdigest()
(args.output / 'SHA256SUMS').write_text(f'{digest}  app-debug.apk\n')
(args.output / 'BUILD-COMMIT.txt').write_text(commit + '\n')
(args.output / 'BUILD-INFO.json').write_text(json.dumps({
    'commit': commit, 'apk_sha256': digest, 'bytes': destination.stat().st_size,
    'signature_verified': True, 'feature_assets_verified': len(features),
    'device_functionality_verified': False,
    'actions_run_id': os.environ.get('GITHUB_RUN_ID'),
}, indent=2))
print(f'Verified APK from {commit}: SHA-256 {digest}')

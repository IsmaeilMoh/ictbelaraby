#!/usr/bin/env python3
"""Static quality gate for ICT بالعربي. Python stdlib only; node optional.
Run from the repository root: python scripts/qa_site.py
Checks production HTML/JS/JSON and local assets. Does not test network feeds or UI.
"""
from pathlib import Path
from html.parser import HTMLParser
import collections
import json
import re
import shutil
import subprocess
import sys
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
# Reference snapshots are not deployed pages.
EXCLUDED = {'index_snippet.html'}

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'script' and a.get('src'): self.refs.append(a['src'])
        if tag == 'link' and a.get('href') and a.get('rel') in {'stylesheet', 'manifest', 'icon', 'apple-touch-icon', 'modulepreload'}:
            self.refs.append(a['href'])
        if tag in {'img', 'source'} and a.get('src'): self.refs.append(a['src'])
        if tag == 'a' and a.get('href'): self.refs.append(a['href'])

def is_local(url):
    if not url or url.startswith(('#', '//')): return False
    parts = urlsplit(url)
    return not parts.scheme and not parts.netloc

def main():
    errors=[]; warnings=[]
    htmls=[p for p in ROOT.glob('*.html') if not p.name.startswith('_qa_') and p.name not in EXCLUDED]
    htmls += sorted((ROOT/'assets').glob('*.html'))
    for path in htmls:
        parser=References(); parser.feed(path.read_text(encoding='utf-8'))
        for val,count in collections.Counter(parser.ids).items():
            if count>1:errors.append(f'{path.name}: duplicate ID {val!r} ({count})')
        for ref in set(parser.refs):
            if not is_local(ref):continue
            local=unquote(urlsplit(ref).path)
            if not local: continue
            target=(ROOT/local.lstrip('/')) if local.startswith('/') else (path.parent/local)
            if not (target.is_file() or (target/'index.html').is_file()):
                errors.append(f'{path.relative_to(ROOT)}: missing local resource {ref}')
    for path in ROOT.glob('*.json'):
        try: json.loads(path.read_text(encoding='utf-8'))
        except Exception as exc:errors.append(f'{path.name}: invalid JSON ({exc})')
    node=shutil.which('node')
    scripts=list(ROOT.glob('*.js'))+list((ROOT/'scripts').glob('*.js'))
    if node:
        for path in scripts:
            run=subprocess.run([node,'--check',str(path)],capture_output=True,text=True)
            if run.returncode:errors.append(f'{path.relative_to(ROOT)}: JavaScript syntax failed: {run.stderr.strip()[:250]}')
    else:
        warnings.append('Node.js not available: JavaScript syntax check skipped')
    serviceworker=ROOT/'sw.js'
    if serviceworker.exists():
        text=serviceworker.read_text(encoding='utf-8')
        match=re.search(r'const CORE\s*=\s*(\[[^;]*\]);',text,re.S)
        if match:
            try:
                entries=json.loads(match.group(1))
                dup=[k for k,c in collections.Counter(entries).items() if c>1]
                if dup:errors.append(f'sw.js: duplicate precache paths: {dup}')
                for ref in entries:
                    target=urlsplit(ref).path.removeprefix('./')
                    if target and not (ROOT/target).is_file():errors.append(f'sw.js: precache resource missing: {ref}')
            except (TypeError, ValueError) as exc:errors.append(f'Could not inspect service worker precache: {exc}')
    print(f'Checked {len(htmls)} production HTML pages, {len(scripts)} JS files, {len(list(ROOT.glob("*.json")))} JSON files')
    for warning in warnings:print('WARNING:',warning)
    for error in errors:print('ERROR:',error)
    if errors:
        print(f'FAILED ({len(errors)} issue(s)) — no network or visual checks were performed')
        return 1
    print('PASS — static references and syntax only; live feeds and UI still require verification')
    return 0

if __name__=='__main__':sys.exit(main())

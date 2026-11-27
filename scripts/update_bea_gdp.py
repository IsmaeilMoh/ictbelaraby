#!/usr/bin/env python3
"""Collect the BEA second estimate of real annualized US GDP growth."""
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from update_bea_results import NY

BASE = 'https://www.bea.gov/news/'
INDICATOR = 'us-gdp-second'
TITLE = 'Prelim GDP q/q'
STAMP = re.compile(r'EMBARGOED UNTIL RELEASE AT (\d{1,2}:\d{2})\s*([ap])\.?m\.?\s+(EDT|EST),?\s+(?:\w+,\s+)?([A-Za-z]+ \d{1,2},\s+\d{4})', re.I)


def parse_release(html, release, year, quarter, url):
    soup = BeautifulSoup(html, 'html.parser')
    ordinal = ['first', 'second', 'third', 'fourth'][quarter - 1]
    suffix = ['1st', '2nd', '3rd', '4th'][quarter - 1]
    heading = re.compile(rf'^GDP \(Second Estimate\).*\b{suffix} Quarter {year}$', re.I)
    if not any(heading.fullmatch(h.get_text(' ', strip=True)) for h in soup.find_all(['h1', 'h2'])):
        raise ValueError('Unexpected BEA GDP release heading')
    stamp = STAMP.search(soup.get_text(' ', strip=True))
    if not stamp:
        raise ValueError('Missing BEA publication timestamp')
    clock, am_pm, tz, day = stamp.groups()
    when = datetime.strptime(f'{day} {clock} {am_pm}m', '%B %d, %Y %I:%M %p').replace(tzinfo=NY)
    if when != release or when.tzname() != tz.upper():
        raise ValueError('BEA and calendar publication times differ')
    pattern = re.compile(rf'^Real gross domestic product \(GDP\) (increased|decreased) at an annual rate of (\d+(?:\.\d+)?) percent in the {ordinal} quarter of {year}\b', re.I)
    matches = [match for p in soup.find_all('p') if (match := pattern.match(p.get_text(' ', strip=True)))]
    if len(matches) != 1:
        raise ValueError('No unambiguous annualized real GDP reading')
    direction, value = matches[0].groups()
    return dict(indicator=INDICATOR, title=TITLE, currency='USD', period=f'{year}-Q{quarter}',
                releaseAt=release.isoformat(), actual=float(value)*(-1 if direction.lower()=='decreased' else 1),
                unit='%', source='BEA', sourceUrl=url)


def run(calendar, output, now):
    candidates = []
    for event in json.loads(calendar.read_text(encoding='utf-8')).get('events', []):
        if event.get('country') == 'USD' and event.get('title') == TITLE:
            release = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
            if release.tzinfo and now-timedelta(days=7) <= release <= now:
                candidates.append(release)
    if not candidates:
        return
    release = max(candidates)
    local = release.astimezone(NY)
    # A second estimate normally follows its reference quarter by two months.
    reference = local.replace(day=1)-timedelta(days=35)
    quarter = (reference.month-1)//3+1
    suffix = ['1st', '2nd', '3rd', '4th'][quarter-1]
    url = f'{BASE}{local.year}/gdp-second-estimate-and-corporate-profits-{suffix}-quarter-{reference.year}'
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    result = parse_release(response.text, release, reference.year, quarter, url)
    data = json.loads(output.read_text(encoding='utf-8'))
    previous = data['events']
    rows = {(row['indicator'], datetime.fromisoformat(row['releaseAt'])):row for row in [*previous,result]}
    events = sorted(rows.values(),key=lambda row: row['releaseAt'],reverse=True)[:24]
    if events != previous:
        pending = output.with_suffix('.tmp')
        pending.write_text(json.dumps(dict(status='ok',updatedAt=now.isoformat(),events=events),indent=2)+'\n',encoding='utf-8')
        pending.replace(output)


if __name__ == '__main__':
    run(Path('calendar-live.json'),Path('economic-verified.json'),datetime.now(timezone.utc))

#!/usr/bin/env python3
"""Publish matched Australian CPI observations from the official ABS release."""
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE = 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/'
SYDNEY = ZoneInfo('Australia/Sydney')
INDICATORS = {
    'CPI m/m': ('au-cpi-mom', 'All groups CPI', 1),
    'CPI y/y': ('au-cpi-yoy', 'All groups CPI', 2),
    'Trimmed Mean CPI m/m': ('au-trimmed-cpi-mom', 'Trimmed mean', 3),
}


def parse_release(html, release_at, now):
    soup = BeautifulSoup(html, 'html.parser')
    if not any(h.get_text(' ', strip=True) == 'Consumer Price Index, Australia' for h in soup.find_all('h1')):
        raise ValueError('Unexpected ABS release')
    text = ' '.join(soup.stripped_strings)
    date = re.search(r'Release date and time\s+(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}:\d{2})\s*(am|pm)\s+(AEDT|AEST)\b', text, re.I)
    reference = re.search(r'Reference period\s+([A-Za-z]+ \d{4})\b', text, re.I)
    if not date or not reference:
        raise ValueError('Missing ABS publication time or reference period')
    day, clock, am_pm, tz = date.groups()
    stamp = datetime.strptime(f'{day} {clock} {am_pm}', '%d/%m/%Y %I:%M %p').replace(tzinfo=SYDNEY)
    if stamp.tzname() != tz.upper() or stamp != release_at or stamp > now:
        raise ValueError('ABS release time does not match the calendar')
    period = datetime.strptime(reference[1], '%B %Y')
    prior = period.replace(day=1) - timedelta(days=1)
    year_ago = period.replace(year=period.year - 1)
    monthly = f'{prior:%b %y} to {period:%b %y} (% change)'
    annual = f'{year_ago:%b %y} to {period:%b %y} (% change)'
    candidates = []
    for table in soup.find_all('table'):
        rows = [[cell.get_text(' ', strip=True) for cell in row.find_all(['th', 'td'], recursive=False)]
                for row in table.find_all('tr')]
        headers = [row for row in rows if len(row) >= 5 and row[-4:] == [monthly, annual, monthly, annual]]
        if headers and any('Original' in row and 'Seasonally adjusted' in row for row in rows):
            candidates.append(rows)
    if len(candidates) != 1:
        raise ValueError('Missing or ambiguous ABS monthly and annual CPI table')
    result = []
    for title, (indicator, label, column) in INDICATORS.items():
        values = [row[column - 5] for row in candidates[0] if len(row) >= 5 and row[-5] == label and not any(row[:-5])]
        if len(values) != 1 or not re.fullmatch(r'[+−-]?\d+(?:\.\d+)?', values[0]):
            continue
        result.append(dict(indicator=indicator, title=title, currency='AUD', period=period.strftime('%Y-%m'),
                           releaseAt=release_at.isoformat(), actual=float(values[0].replace('−', '-')), unit='%',
                           source='ABS', sourceUrl=BASE + period.strftime('%b-%Y').lower()))
    if not result:
        raise ValueError('No comparable ABS CPI values')
    return result


def run(calendar, output, now):
    candidates = {}
    for event in json.loads(calendar.read_text(encoding='utf-8')).get('events', []):
        if event.get('country') != 'AUD' or event.get('title') not in INDICATORS:
            continue
        release = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
        if release.tzinfo and now - timedelta(days=7) <= release <= now:
            candidates.setdefault(release, set()).add(event['title'])
    if not candidates:
        print('No recent AUD CPI release in the calendar')
        return
    release = max(candidates)
    response = requests.get(BASE + 'latest-release', timeout=20)
    response.raise_for_status()
    verified = [row for row in parse_release(response.text, release, now) if row['title'] in candidates[release]]
    if not verified:
        raise ValueError('No released figure matched the calendar')
    previous = json.loads(output.read_text(encoding='utf-8')).get('events', []) if output.exists() else []
    rows = {(row['releaseAt'], row['indicator']): row for row in [*previous, *verified]}
    events = [rows[key] for key in sorted(rows, reverse=True)[:12]]
    if events == previous:
        print('ABS observations already current')
        return
    pending = output.with_suffix('.tmp')
    pending.write_text(json.dumps(dict(source='ABS', status='ok', updatedAt=now.isoformat(), events=events), indent=2)+'\n', encoding='utf-8')
    pending.replace(output)
    print('ABS verified indicators:', len(verified))


if __name__ == '__main__':
    run(Path('calendar-live.json'), Path('economic-abs.json'), datetime.now(timezone.utc))

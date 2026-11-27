#!/usr/bin/env python3
"""Fetch the official monthly Core PCE reading for a scheduled release."""
import argparse
import calendar
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

NY = ZoneInfo('America/New_York')
INDICATORS = {
    'core-pce-mom': ('Core PCE Price Index m/m', 'PCE price index excluding food and energy'),
    'personal-income-mom': ('Personal Income m/m', 'Personal income'),
    'personal-spending-mom': ('Personal Spending m/m', 'Personal consumption expenditures'),
}


def parse_release(html, period, released_at, source_url, indicator='core-pce-mom'):
    title, label = INDICATORS[indicator]
    soup = BeautifulSoup(html, 'html.parser')
    heading = f'Personal Income and Outlays, {period:%B %Y}'
    if not any(tag.get_text(' ', strip=True).casefold() == heading.casefold()
               for tag in soup.find_all(['h1', 'h2', 'h3'])):
        raise ValueError('Unexpected BEA release period')
    release = re.search(
        r'EMBARGOED UNTIL RELEASE AT (\d{1,2}:\d{2})\s*([ap])\.?m\.?\s+(EDT|EST),?\s+(?:\w+,\s+)?([A-Za-z]+ \d{1,2},\s+\d{4})',
        soup.get_text(' ', strip=True), re.IGNORECASE)
    if not release:
        raise ValueError('Missing BEA release timestamp')
    clock, ampm, zone, date = release.groups()
    stamp = datetime.strptime(f'{date} {clock} {ampm}m', '%B %d, %Y %I:%M %p').replace(tzinfo=NY)
    if stamp.tzname() != zone.upper() or stamp != released_at.astimezone(NY):
        raise ValueError('Calendar time does not match BEA release')

    matches = []
    for table in soup.find_all('table'):
        preceding = table.find_previous_sibling()
        context = list(table.stripped_strings)
        if preceding and preceding.name in ('p', 'h2', 'h3', 'div'):
            context.append(preceding.get_text(' ', strip=True))
        if not any(re.fullmatch(r'\[?percent change from preceding month\]?', text.casefold()) for text in context):
            continue
        for row in table.find_all('tr'):
            cells = [cell.get_text(' ', strip=True) for cell in row.find_all(['th', 'td'], recursive=False)]
            if len(cells) >= 3 and cells[0].casefold() == label.casefold():
                values = [value.replace('−', '-') for value in cells[-2:]]
                if all(re.fullmatch(r'[+-]?\d+\.\d+', value) for value in values):
                    matches.append(tuple(map(float, values)))
    if len(matches) != 1:
        raise ValueError('Missing or ambiguous Core PCE table row')
    previous, actual = matches[0]
    return dict(indicator=indicator, title=title, currency='USD', period=period.strftime('%Y-%m'),
                releaseAt=released_at.isoformat(), actual=actual, previous=previous,
                unit='%', source='BEA', sourceUrl=source_url)


def run(calendar_file, output, now):
    payload = json.loads(calendar_file.read_text(encoding='utf-8'))
    candidates = {}
    by_title = {title.casefold(): key for key, (title, _) in INDICATORS.items()}
    for event in payload.get('events', []):
        indicator = by_title.get(event.get('title', '').strip().casefold())
        if not indicator or (event.get('country') or event.get('currency')) != 'USD':
            continue
        release = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
        if release.tzinfo is not None and now - timedelta(days=6) <= release <= now:
            candidates.setdefault(release, set()).add(indicator)
    if not candidates:
        print('No recently scheduled BEA income and outlays release to check')
        return
    previous = json.loads(output.read_text(encoding='utf-8')).get('events', []) if output.exists() else []
    known = {(datetime.fromisoformat(row['releaseAt']), row['indicator']): row for row in previous}
    for release, indicators in sorted(candidates.items()):
        # A delayed report can cover an older reference month. Accept its page
        # only when BEA's embargo timestamp matches the calendar event.
        period = release.astimezone(NY).replace(day=1) - timedelta(days=1)
        for _ in range(3):
            url = f'https://www.bea.gov/news/{release.astimezone(NY).year}/personal-income-and-outlays-{calendar.month_name[period.month].lower()}-{period.year}'
            response = requests.get(url, timeout=18)
            if response.status_code != 404:
                response.raise_for_status()
                verified = {}
                for indicator in indicators:
                    try:
                        verified[(release, indicator)] = parse_release(response.text, period, release, url, indicator)
                    except ValueError:
                        continue
                if verified:
                    known.update(verified)
                    break
            period = period.replace(day=1) - timedelta(days=1)
        else:
            print(f'No BEA release verified for {release.isoformat()}')
    recent = sorted({release for release, _ in known}, reverse=True)[:4]
    events = [known[key] for key in sorted(known, reverse=True) if key[0] in recent]
    if not events or events == previous:
        return
    payload = dict(source='BEA', status='ok', updatedAt=now.isoformat(), events=events)
    pending = output.with_suffix('.tmp')
    pending.write_text(json.dumps(payload, indent=2)+'\n', encoding='utf-8')
    pending.replace(output)
    print(f'BEA income and outlays verified through {events[0]["period"]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--calendar', type=Path, default=Path('calendar-live.json'))
    parser.add_argument('--output', type=Path, default=Path('economic-bea.json'))
    args = parser.parse_args()
    run(args.calendar, args.output, datetime.now(timezone.utc))

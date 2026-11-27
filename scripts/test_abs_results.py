from datetime import datetime, timezone
from unittest import TestCase

from update_abs_results import parse_release

RELEASE = datetime(2026, 11, 25, 0, 30, tzinfo=timezone.utc)
# Minimal fixture of the October 2026 release: original CPI and seasonally adjusted Trimmed mean.
HTML = '''<h1>Consumer Price Index, Australia</h1>
<p>Reference period</p><p>October 2026</p>
<p>Release date and time</p><time>25/11/2026 11:30am AEDT</time>
<table><tr><th></th><th></th><th colspan="2">Original</th><th colspan="2">Seasonally adjusted</th></tr>
<tr><th>Series</th><th>Sep 26 to Oct 26 (% change)</th><th>Oct 25 to Oct 26 (% change)</th>
<th>Sep 26 to Oct 26 (% change)</th><th>Oct 25 to Oct 26 (% change)</th></tr>
<tr><th>All groups CPI</th><td>0.5</td><td>4.9</td><td>0.7</td><td>4.9</td></tr>
<tr><th></th><th>Trimmed mean</th><td>n/a</td><td>n/a</td><td>0.5</td><td>3.8</td></tr></table>'''


class ABSResultsTest(TestCase):
    def test_uses_original_cpi_and_monthly_trimmed_mean(self):
        rows = parse_release(HTML, RELEASE, RELEASE)
        self.assertEqual({row['indicator']: row['actual'] for row in rows},
                         {'au-cpi-mom': 0.5, 'au-cpi-yoy': 4.9, 'au-trimmed-cpi-mom': 0.5})
        self.assertTrue(all(row['period'] == '2026-10' for row in rows))

    def test_rejects_wrong_calendar_time_or_measurement_period(self):
        for html in [HTML.replace('11:30', '11:31'), HTML.replace('AEDT', 'AEST'),
                     HTML.replace('October 2026', 'September 2026'), HTML.replace('(% change)', '(index)')]:
            with self.subTest(html=html), self.assertRaises(ValueError):
                parse_release(html, RELEASE, RELEASE)

    def test_rejects_monthly_value_from_the_future(self):
        with self.assertRaises(ValueError):
            parse_release(HTML, RELEASE, RELEASE.replace(hour=0, minute=29))

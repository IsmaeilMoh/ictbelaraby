from datetime import datetime, timezone
from unittest import TestCase

from update_bea_results import parse_release

RELEASE = datetime(2026, 11, 25, 13, 30, tzinfo=timezone.utc)
PERIOD = datetime(2026, 10, 1)
HTML = """<h1>Personal Income and Outlays, October 2026</h1>
<p>EMBARGOED UNTIL RELEASE AT 8:30 a.m. EST, Wednesday, November 25, 2026</p>
<table><caption>Percent change from preceding month</caption>
<tr><th>PCE price index</th><td>0.5</td><td>0.4</td></tr>
<tr><th>PCE price index excluding food and energy</th><td>0.3</td><td>0.0</td></tr></table>"""


class BeaTest(TestCase):
    def test_exact_monthly_core_row(self):
        row = parse_release(HTML, PERIOD, RELEASE, 'https://www.bea.gov/')
        self.assertEqual((row['actual'], row['previous'], row['period']), (0, 0.3, '2026-10'))

    def test_mismatched_time_or_period_rejected(self):
        for html in [HTML.replace('8:30', '9:30'), HTML.replace('EST', 'EDT'),
                     HTML.replace('October', 'September'), HTML.replace('preceding month', 'year ago')]:
            with self.assertRaises(ValueError):
                parse_release(html, PERIOD, RELEASE, 'https://www.bea.gov/')

    def test_missing_or_ambiguous_values_rejected(self):
        for html in [HTML.replace('0.0', '—'), HTML + HTML[HTML.index('<table>'):]]:
            with self.assertRaises(ValueError):
                parse_release(html, PERIOD, RELEASE, 'https://www.bea.gov/')

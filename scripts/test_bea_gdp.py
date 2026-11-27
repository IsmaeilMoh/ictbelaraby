from datetime import datetime, timezone
from unittest import TestCase

from update_bea_gdp import parse_release

RELEASE = datetime(2026, 11, 25, 13, 30, tzinfo=timezone.utc)
URL = 'https://www.bea.gov/news/2026/gdp-second-estimate-and-corporate-profits-3rd-quarter-2026'


def sample(direction):
    return f'''<h1>GDP (Second Estimate) and Corporate Profits, 3rd Quarter 2026</h1>
<p>EMBARGOED UNTIL RELEASE AT 8:30 a.m. EST, Wednesday, November 25, 2026</p>
<p>Real gross domestic product (GDP) {direction} at an annual rate of 4.3 percent in the third quarter of 2026.</p>'''


class BeaGDPTest(TestCase):
    def test_only_annualized_real_second_estimate(self):
        self.assertEqual(parse_release(sample('increased'), RELEASE, 2026, 3, URL)['actual'], 4.3)
        self.assertEqual(parse_release(sample('decreased'), RELEASE, 2026, 3, URL)['actual'], -4.3)
        for altered in ('Advance', 'EDT', 'current-dollar', 'quarterly'):
            original = {'Advance': 'Second', 'EDT': 'EST', 'current-dollar': 'Real', 'quarterly': 'annual'}[altered]
            with self.subTest(altered=altered), self.assertRaises(ValueError):
                parse_release(sample('increased').replace(original, altered), RELEASE, 2026, 3, URL)

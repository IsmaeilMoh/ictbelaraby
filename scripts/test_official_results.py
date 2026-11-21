import unittest
from update_official_results import build,prev_month

class OfficialTests(unittest.TestCase):
 def test_month_roll(self):self.assertEqual(prev_month('2026-01'),'2025-12')
 def test_yoy_and_previous(self):
  values=[{'year':'2026','period':f'M{m:02}','value':str(100+m)} for m in range(1,4)]
  values += [{'year':'2025','period':f'M{m:02}','value':str(90+m)} for m in range(1,4)]
  payload={'Results':{'series':[{'seriesID':'CUUR0000SA0','data':values}]}}
  out=build(payload,'2026-11-21T00:00:00Z')
  e=out['events'][0];self.assertEqual(e['period'],'2026-03');self.assertIsNone(e['forecast']);self.assertEqual(e['source'],'BLS');self.assertIsNotNone(e['previous'])
 def test_unemployment_previous(self):
  payload={'Results':{'series':[{'seriesID':'LNS14000000','data':[{'year':'2026','period':'M11','value':'4.2'},{'year':'2026','period':'M10','value':'4.1'},{'year':'2026','period':'M09','value':'4.0'}]}]}}
  e=build(payload,'test')['events'][0];self.assertEqual(e['actual'],4.2);self.assertEqual(e['previous'],4.1)
 def test_reject_missing(self):
  with self.assertRaises(RuntimeError):build({'Results':{'series':[]}},'test')
if __name__=='__main__':unittest.main()

#!/usr/bin/env python3
from pathlib import Path
import json, datetime
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'data/opportunities.json').read_text())
HEALTH=json.loads((ROOT/'verification/health.json').read_text())
SIGNALS=[
"LOW_INCOME","PELL","FIRST_GEN","LIMITED_ACCESS","HOUSING_INSECURE","FOSTER_CARE","RURAL","WOMAN","MAN","GENDER_MINORITY","BLACK","HISPANIC","AIAN","NHPI","ASIAN","LGBTQ","DISABILITY","VETERAN","MILITARY_DEPENDENT","IMMIGRANT_CHILD","US_CITIZEN","PERMANENT_RESIDENT","DACA_UNDOCUMENTED","WORK_AUTHORIZED","HBCU","HSI","TRIBAL_COLLEGE","COMMUNITY_COLLEGE","TRANSFER","ADULT_LEARNER","STUDENT_PARENT","PRIOR_RESEARCH","PHD_INTENT","FIRST_STUDY_ABROAD","GPA34","AEROSPACE","AI","BUSINESS","CHEMISTRY","COMP_ENG","EE","CS","CONSULTING","CYBERSECURITY","DATA_SCIENCE","ECONOMICS","EDUCATION","ENGINEERING","ENVIRONMENT","FINANCE","GOVERNMENT","HEALTHCARE","HUMANITIES","INTERNATIONAL","INVESTMENT","MANUFACTURING","MATH","POLICY","PUBLIC_SERVICE","QUANT","RESEARCH","SCIENCE","SOFTWARE","TECH"]
assert len(SIGNALS)==64
idx={s:i for i,s in enumerate(SIGNALS)}
def mask(names):
    out=0
    for n in names: out |= 1 << idx[n]
    return str(out)
for r in DATA:
    r['requiredMask']=mask(r['requiredSignals'])
    r['preferredMask']=mask(r['preferredSignals'])
    r['excludedMask']=mask(r['excludedSignals'])
(ROOT/'data.js').write_text('window.OPPORTUNITYBRIDGE_DATA = '+json.dumps(DATA,separators=(',',':'),ensure_ascii=False)+';\n')
(ROOT/'verification.js').write_text('window.OPPORTUNITYBRIDGE_HEALTH = '+json.dumps(HEALTH,separators=(',',':'))+';\n')
(ROOT/'signals.js').write_text('window.OB_SIGNALS = '+json.dumps({s:i for i,s in enumerate(SIGNALS)},separators=(',',':'))+';\n')
print(f'Built browser assets for {len(DATA)} opportunities.')

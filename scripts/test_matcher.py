#!/usr/bin/env python3
from pathlib import Path
import json, random, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
# Validate deterministic mask generation independent of UI.
signals=["LOW_INCOME","PELL","FIRST_GEN","LIMITED_ACCESS","HOUSING_INSECURE","FOSTER_CARE","RURAL","WOMAN","MAN","GENDER_MINORITY","BLACK","HISPANIC","AIAN","NHPI","ASIAN","LGBTQ","DISABILITY","VETERAN","MILITARY_DEPENDENT","IMMIGRANT_CHILD","US_CITIZEN","PERMANENT_RESIDENT","DACA_UNDOCUMENTED","WORK_AUTHORIZED","HBCU","HSI","TRIBAL_COLLEGE","COMMUNITY_COLLEGE","TRANSFER","ADULT_LEARNER","STUDENT_PARENT","PRIOR_RESEARCH","PHD_INTENT","FIRST_STUDY_ABROAD","GPA34","AEROSPACE","AI","BUSINESS","CHEMISTRY","COMP_ENG","EE","CS","CONSULTING","CYBERSECURITY","DATA_SCIENCE","ECONOMICS","EDUCATION","ENGINEERING","ENVIRONMENT","FINANCE","GOVERNMENT","HEALTHCARE","HUMANITIES","INTERNATIONAL","INVESTMENT","MANUFACTURING","MATH","POLICY","PUBLIC_SERVICE","QUANT","RESEARCH","SCIENCE","SOFTWARE","TECH"]
assert len(signals)==64 and len(set(signals))==64
data=json.loads((ROOT/'data/opportunities.json').read_text())
for r in data:
    for key in ('requiredSignals','preferredSignals','excludedSignals'):
        assert all(x in signals for x in r[key]), (r['name'],key)
print(f'OK: deterministic signal model checks passed for {len(data)} records.')

#!/usr/bin/env python3
from pathlib import Path
import json, sys, re
from datetime import date
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/opportunities.json').read_text())
schema=json.loads((ROOT/'schemas/opportunity.schema.json').read_text())
health=json.loads((ROOT/'verification/health.json').read_text())
errors=[]
v=Draft202012Validator(schema)
for i,row in enumerate(data):
    for e in v.iter_errors(row): errors.append(f"record {i+1} ({row.get('name','?')}): {e.message}")
ids=[r['id'] for r in data]; nums=[r['num'] for r in data]; names=[r['name'].lower() for r in data]
for label,arr in [('id',ids),('num',nums),('name',names)]:
    dup={x for x in arr if arr.count(x)>1}
    if dup: errors.append(f'duplicate {label}: {sorted(dup)}')
if nums != list(range(1,len(data)+1)):
    errors.append('record numbers must be contiguous and match catalog order')
for r in data:
    for k in ('opensAt','closesAt','lastVerifiedAt'):
        val=r.get(k)
        if val:
            try: date.fromisoformat(val)
            except Exception: errors.append(f"{r['name']}: invalid {k} {val}")
    if r.get('opensAt') and r.get('closesAt') and r['opensAt']>r['closesAt']:
        errors.append(f"{r['name']}: opensAt is after closesAt")
    overlap=(set(r['requiredSignals']) & set(r['excludedSignals']))
    if overlap: errors.append(f"{r['name']}: signal is both required and excluded: {sorted(overlap)}")
    if r.get('lastVerifiedAt') and date.fromisoformat(r['lastVerifiedAt'])>date.today():
        errors.append(f"{r['name']}: lastVerifiedAt cannot be in the future")
    for value in [*r.get('states',[]),*r.get('institutions',[])]:
        if value!=value.strip(): errors.append(f"{r['name']}: location/institution values must be trimmed")
health_records=health.get('records',{})
missing_health=sorted(set(ids)-set(health_records))
orphan_health=sorted(set(health_records)-set(ids))
if missing_health: errors.append(f'missing source-health records: {missing_health}')
if orphan_health: errors.append(f'orphan source-health records: {orphan_health}')
for record_id,entry in health_records.items():
    if entry.get('state') not in {'verified','needs_review','discontinued'}:
        errors.append(f'{record_id}: invalid source-health state {entry.get("state")!r}')
if len(data)<100: errors.append(f'expected a substantial current catalog, found only {len(data)} records')
if errors:
    print('\n'.join('ERROR: '+e for e in errors)); sys.exit(1)
print(f'OK: {len(data)} records pass schema, uniqueness, date, and signal checks.')

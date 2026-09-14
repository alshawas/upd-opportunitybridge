(() => {
  const DATA = () => window.OPPORTUNITYBRIDGE_DATA || [];
  const HEALTH = () => (window.OPPORTUNITYBRIDGE_HEALTH || {records:{}}).records || {};
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const savedKey='ob-saved-v4', profileKey='ob-profile-v4';
  const signalMap={
    lowIncome:'LOW_INCOME',pell:'PELL',firstGen:'FIRST_GEN',inequitableAccess:'LIMITED_ACCESS',housingInsecure:'HOUSING_INSECURE',fosterCare:'FOSTER_CARE',rural:'RURAL',
    black:'BLACK',hispanic:'HISPANIC',aian:'AIAN',nhpi:'NHPI',asian:'ASIAN',lgbtq:'LGBTQ',disability:'DISABILITY',veteran:'VETERAN',militaryDependent:'MILITARY_DEPENDENT',immigrantChild:'IMMIGRANT_CHILD',newAmerican:'IMMIGRANT_CHILD',
    hbcu:'HBCU',hsi:'HSI',tcu:'TRIBAL_COLLEGE',transfer:'TRANSFER',adultLearner:'ADULT_LEARNER',parentGuardian:'STUDENT_PARENT',priorResearch:'PRIOR_RESEARCH',phdIntent:'PHD_INTENT',firstStudyAbroad:'FIRST_STUDY_ABROAD',gpa34:'GPA34',workAuthorizedUS:'WORK_AUTHORIZED'
  };
  const interestSignals={
    'Aerospace':'AEROSPACE','Artificial Intelligence':'AI','Business':'BUSINESS','Chemistry':'CHEMISTRY','Computer Engineering':'COMP_ENG','Electrical Engineering':'EE','Computer Science':'CS','Consulting':'CONSULTING','Cybersecurity':'CYBERSECURITY','Data Science':'DATA_SCIENCE','Economics':'ECONOMICS','Education':'EDUCATION','Engineering':'ENGINEERING','Environment':'ENVIRONMENT','Finance':'FINANCE','Government':'GOVERNMENT','Healthcare':'HEALTHCARE','Humanities':'HUMANITIES','International Affairs':'INTERNATIONAL','Investment Management':'INVESTMENT','Manufacturing':'MANUFACTURING','Mathematics':'MATH','Public Policy':'POLICY','Public Service':'PUBLIC_SERVICE','Quantitative':'QUANT','Research':'RESEARCH','Science':'SCIENCE','Software Engineering':'SOFTWARE','Study Abroad':'INTERNATIONAL','Technology':'TECH','Real Estate':'BUSINESS'
  };

  function initCommon(){
    const themeBtn=document.createElement('button'); themeBtn.className='theme-toggle'; themeBtn.type='button'; themeBtn.setAttribute('aria-label','Toggle light and dark theme');
    function paint(){const dark=document.documentElement.dataset.theme==='dark';themeBtn.innerHTML=dark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>';}
    paint(); themeBtn.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('ob-theme',next);paint();});
    const mobile=qs('.mobile-menu'); if(mobile){mobile.parentElement.append(themeBtn,mobile);mobile.addEventListener('click',()=>{const nav=qs('.nav-links');const open=nav.classList.toggle('open');mobile.setAttribute('aria-expanded',String(open));});} else qs('.nav')?.appendChild(themeBtn);
    updateSavedCounts();
  }
  function getSaved(){try{return new Set(JSON.parse(localStorage.getItem(savedKey)||'[]'));}catch{return new Set();}}
  function setSaved(set){localStorage.setItem(savedKey,JSON.stringify([...set]));updateSavedCounts();}
  function updateSavedCounts(){const n=getSaved().size;qsa('[data-saved-count]').forEach(x=>x.textContent=n);}
  function healthFor(op){
    const h={state:'needs_review',lastChecked:op.lastVerifiedAt,...HEALTH()[op.id]};
    const age=daysAgo(h.lastChecked);
    if(h.state==='verified' && age!==null && age>14) return {...h,state:'needs_review',stale:true};
    return h;
  }
  function visibleData(){return DATA().filter(op=>op.active!==false && healthFor(op).state!=='discontinued');}
  function currentStatus(op){
    const today=new Date(); today.setHours(0,0,0,0);
    const open=op.opensAt?new Date(op.opensAt+'T00:00:00'):null, close=op.closesAt?new Date(op.closesAt+'T23:59:59'):null;
    if(open && today<open) return 'upcoming'; if(close && today>close) return 'closed';
    if(open||close) return 'open';
    if(op.statusHint==='rolling') return 'rolling'; if(op.statusHint==='closed') return 'closed'; if(op.statusHint==='upcoming') return 'upcoming'; return 'active';
  }
  function statusLabel(s){return ({open:'Open now',rolling:'Rolling / ongoing',upcoming:'Upcoming',closed:'Window closed',active:'Active program'})[s]||'Active program';}
  function formatDate(iso){if(!iso)return '';try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(iso+'T12:00:00'));}catch{return iso;}}
  function initials(name){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
  function daysAgo(iso){if(!iso)return null; const d=new Date(iso); if(Number.isNaN(d))return null; return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
  function toast(title,copy){const t=qs('#toast');if(!t)return;qs('#toast-title').textContent=title;qs('#toast-copy').textContent=copy;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2200);}

  function profileFromForm(form){
    const fd=new FormData(form); const signalNames=[];
    for(const [name,sig] of Object.entries(signalMap)){const el=form.elements[name]; if(el && ((el.type==='checkbox'&&el.checked)||(el.type!=='checkbox'&&fd.get(name)))) signalNames.push(sig);}
    const gender=fd.get('gender'); if(gender==='woman')signalNames.push('WOMAN'); if(gender==='man')signalNames.push('MAN'); if(gender==='genderMinority')signalNames.push('GENDER_MINORITY');
    const cit=fd.get('citizenshipStatus'); if(cit==='usCitizen')signalNames.push('US_CITIZEN','WORK_AUTHORIZED'); if(cit==='permanentResident')signalNames.push('PERMANENT_RESIDENT','WORK_AUTHORIZED'); if(cit==='daca')signalNames.push('DACA_UNDOCUMENTED'); if(cit==='refugeeAsylee')signalNames.push('WORK_AUTHORIZED','IMMIGRANT_CHILD');
    const interests=[]; const primary=fd.get('interest'); if(primary) interests.push(primary); fd.getAll('additionalInterest').forEach(x=>{if(!interests.includes(x)) interests.push(x);});
    for(const i of interests){const sig=interestSignals[i]; if(sig)signalNames.push(sig);}
    if(fd.get('stage')==='Community College')signalNames.push('COMMUNITY_COLLEGE');
    return {stage:fd.get('stage')||'',state:fd.get('state')||'',institution:fd.get('lsuStudent')?'Louisiana State University':'',interests,signalNames:[...new Set(signalNames)],gender,citizenship:cit};
  }
  function saveProfile(form){const out={};for(const el of qsa('input,select',form)){if(!el.name)continue;if(el.type==='checkbox'){out[el.name]=out[el.name]||[];if(el.checked)out[el.name].push(el.value||'on');}else out[el.name]=el.value;}localStorage.setItem(profileKey,JSON.stringify(out));}
  function restoreProfile(form){try{const p=JSON.parse(localStorage.getItem(profileKey)||'{}');for(const el of qsa('input,select',form)){if(!el.name||p[el.name]===undefined)continue;if(el.type==='checkbox')el.checked=(p[el.name]||[]).includes(el.value||'on');else el.value=p[el.name];}}catch{}}
  function profileProgress(form){const p=profileFromForm(form);let points=0,total=8;if(p.stage)points++;if(p.interests.length)points++;if(p.state)points++;if(p.institution)points++;if(p.signalNames.some(x=>['LOW_INCOME','PELL','FIRST_GEN','LIMITED_ACCESS'].includes(x)))points++;if(p.gender)points++;if(p.citizenship)points++;if(p.signalNames.some(x=>['PRIOR_RESEARCH','PHD_INTENT','GPA34','TRANSFER','HBCU','HSI','TRIBAL_COLLEGE'].includes(x)))points++;return Math.round(points/total*100);}

  function detailReason(op, profile, result){
    const bits=[]; if(result.explicitConflict)bits.push('One disclosed profile signal conflicts with this program’s stated audience.');
    if(profile.stage && op.stages.includes(profile.stage))bits.push(`Your ${profile.stage.toLowerCase()} stage fits.`);
    const ins=profile.interests.filter(x=>op.interests.includes(x)); if(ins.length)bits.push(`Your ${ins.slice(0,2).join(' / ')} interest aligns.`);
    if(profile.state && (op.states||[]).includes(profile.state))bits.push(`This program includes students in ${profile.state}.`);
    if(profile.institution && (op.institutions||[]).includes(profile.institution))bits.push('This program is offered through your institution.');
    if(!bits.length)bits.push('Your profile is incomplete or this program has broad eligibility; check the official source for details.'); return bits;
  }
  function openModal(op,profile,result){
    const back=qs('#opportunity-modal'); if(!back)return; const h=healthFor(op),st=currentStatus(op),ago=daysAgo(h.lastChecked||op.lastVerifiedAt);
    const requirements=(op.requirements||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('');
    qs('.modal-content',back).innerHTML=`<div class="card-badges"><span class="badge ${st}">${statusLabel(st)}</span><span class="badge">${escapeHtml(op.displayType)}</span></div><h2>${escapeHtml(op.name)}</h2><div class="modal-org">${escapeHtml(op.organization)}</div><div class="detail-grid"><div class="detail-box"><span>Match estimate</span><strong>${result.score}%</strong></div><div class="detail-box"><span>Automated source check</span><strong>${h.state==='verified'?'Source checked':'Needs review'}${ago!==null?` · ${ago}d ago`:''}</strong></div><div class="detail-box"><span>Application window</span><strong>${escapeHtml(op.statusNote)}</strong></div><div class="detail-box"><span>Program reviewed</span><strong>${escapeHtml(formatDate(op.lastVerifiedAt))}</strong></div></div><p class="modal-copy">${escapeHtml(op.description)}</p>${op.award?`<div class="callout"><strong>What it provides</strong><br>${escapeHtml(op.award)}</div>`:''}${op.eligibilityNote?`<div class="callout"><strong>Eligibility context</strong><br>${escapeHtml(op.eligibilityNote)}</div>`:''}${requirements?`<div class="callout"><strong>Requirements to verify</strong><ul>${requirements}</ul></div>`:''}<div class="callout"><strong>Why it surfaced</strong><br>${detailReason(op,profile,result).map(escapeHtml).join('<br>')}</div><div class="modal-actions"><a class="btn btn-primary" target="_blank" rel="noopener" href="${op.sourceUrl}">Open official source ↗</a><button class="btn btn-secondary" type="button" data-modal-save="${op.id}">${getSaved().has(op.id)?'Remove saved':'Save opportunity'}</button></div>`;
    back.classList.add('open'); document.body.style.overflow='hidden';
    qs('[data-modal-save]',back)?.addEventListener('click',e=>{toggleSaved(op.id);e.currentTarget.textContent=getSaved().has(op.id)?'Remove saved':'Save opportunity';});
  }
  function closeModal(){const b=qs('#opportunity-modal');if(b)b.classList.remove('open');document.body.style.overflow='';}
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function toggleSaved(id){const s=getSaved();if(s.has(id)){s.delete(id);toast('Removed','Opportunity removed from saved.');}else{s.add(id);toast('Saved','Opportunity added to your list.');}setSaved(s);document.dispatchEvent(new CustomEvent('ob:saved'));}

  async function initDiscover(){
    const form=qs('#match-form'); if(!form)return; restoreProfile(form);
    const params=new URLSearchParams(location.search);
    if(params.get('stage')&&form.elements.stage)form.elements.stage.value=params.get('stage');
    if(params.get('interest')&&form.elements.interest)form.elements.interest.value=params.get('interest');
    await window.OBMatcher.init();
    const requestedProgram=DATA().find(o=>o.id===params.get('program'));
    let profile=profileFromForm(form), likelyOnly=false, savedOnly=params.get('saved')==='1', query=requestedProgram?requestedProgram.name:'',type='',status='',sort='match';
    if(requestedProgram&&qs('#keyword-search'))qs('#keyword-search').value=requestedProgram.name;
    const prog=qs('#profile-progress');
    function syncProgress(){const v=profileProgress(form);prog.style.setProperty('--progress',v);qs('span',prog).textContent=v+'%';}
    function summary(){const labels=[];if(profile.stage)labels.push(profile.stage);labels.push(...profile.interests.slice(0,2));if(profile.institution)labels.push('LSU');if(profile.signalNames.includes('FIRST_GEN'))labels.push('First-gen');if(profile.signalNames.includes('LOW_INCOME'))labels.push('Financial need');qs('#profile-summary').innerHTML=labels.slice(0,4).map(x=>`<span class="summary-chip">${escapeHtml(x)}</span>`).join('');}
    function render(){
      profile=profileFromForm(form); saveProfile(form); syncProgress(); summary(); const saved=getSaved();
      let scored=visibleData().map(op=>({op,res:window.OBMatcher.score(op,profile)}));
      if(query){const q=query.toLowerCase();scored=scored.filter(({op})=>(op.name+' '+op.organization+' '+op.interests.join(' ')+' '+op.displayType).toLowerCase().includes(q));}
      if(type)scored=scored.filter(x=>x.op.type===type);if(status)scored=scored.filter(x=>currentStatus(x.op)===status);if(likelyOnly)scored=scored.filter(x=>x.res.score>=70&&!x.res.explicitConflict);if(savedOnly)scored=scored.filter(x=>saved.has(x.op.id));
      if(sort==='name')scored.sort((a,b)=>a.op.name.localeCompare(b.op.name));else if(sort==='deadline')scored.sort((a,b)=>(a.op.closesAt||'9999').localeCompare(b.op.closesAt||'9999'));else scored.sort((a,b)=>b.res.score-a.res.score||Number(b.op.featured)-Number(a.op.featured));
      qs('#results-number').textContent=scored.length;qs('#results-caption').textContent=savedOnly?'Showing your saved programs.':'Source-linked programs, ranked locally.';
      const grid=qs('#results-grid'); if(!scored.length){grid.innerHTML='<div class="empty-state"><strong>No programs match these filters.</strong><br>Try clearing a filter or leaving optional profile fields blank.</div>';updateDiagnostics();return;}
      grid.innerHTML=scored.map(({op,res})=>{const st=currentStatus(op),h=healthFor(op),isSaved=saved.has(op.id);const deadline=op.closesAt?`Deadline ${formatDate(op.closesAt)}`:op.statusNote;const reasons=res.reasons.length?res.reasons.slice(0,3):['broad eligibility'];return `<article class="opportunity-card" data-id="${op.id}"><div class="card-top"><div class="org-mark">${initials(op.organization)}</div><div class="card-actions"><button class="icon-button ${isSaved?'saved':''}" aria-label="${isSaved?'Remove from':'Save to'} saved opportunities" data-save="${op.id}"><svg viewBox="0 0 24 24" fill="${isSaved?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg></button></div></div><div class="card-badges"><span class="badge ${st}">${statusLabel(st)}</span><span class="badge">${escapeHtml(op.displayType)}</span>${h.state==='needs_review'?'<span class="badge review">Source review</span>':''}</div><h3 class="card-title">${escapeHtml(op.name)}</h3><div class="card-org">${escapeHtml(op.organization)}</div><p class="card-copy">${escapeHtml(op.description)}</p><div class="match-block"><div class="match-score">${res.score}% <small>match</small></div><div class="match-reasons">${reasons.map(r=>`<span class="reason-pill">${escapeHtml(r)}</span>`).join('')}</div></div><div class="card-foot"><span class="deadline">${escapeHtml(deadline)}</span><button class="text-link" type="button" data-details="${op.id}">Details →</button></div></article>`}).join('');
      qsa('[data-save]',grid).forEach(b=>b.addEventListener('click',()=>{toggleSaved(b.dataset.save);render();})); qsa('[data-details]',grid).forEach(b=>b.addEventListener('click',()=>{const item=scored.find(x=>x.op.id===b.dataset.details);openModal(item.op,profile,item.res);})); updateDiagnostics();
    }
    function updateDiagnostics(){const m=window.OBMatcher.metrics();qs('#diag-engine').textContent=m.engine;qs('#diag-programs').textContent=visibleData().length+' visible';qs('#diag-average').textContent=m.evaluations?m.averageMs.toFixed(4)+' ms':'—';qs('#diag-cache').textContent=`${m.cacheHits} hits / ${m.cacheMisses} misses`;qs('#diag-wasm').textContent=m.wasmBytes?`${m.wasmBytes} bytes`:'fallback';const h=window.OPPORTUNITYBRIDGE_HEALTH||{};qs('#diag-verification').textContent=(h.generatedAt||'snapshot').slice(0,10);}
    qsa('input,select',form).forEach(el=>el.addEventListener('change',()=>{profile=profileFromForm(form);syncProgress();})); form.addEventListener('submit',e=>{e.preventDefault();render();qs('#results-top').scrollIntoView({behavior:'smooth',block:'start'});});qs('[data-reset]')?.addEventListener('click',()=>{form.reset();localStorage.removeItem(profileKey);render();});
    qs('#keyword-search').addEventListener('input',e=>{query=e.target.value.trim();render();});qs('#type-filter').addEventListener('change',e=>{type=e.target.value;render();});qs('#status-filter').addEventListener('change',e=>{status=e.target.value;render();});qs('#sort-results').addEventListener('change',e=>{sort=e.target.value;render();});
    const likely=qs('#likely-toggle');likely.addEventListener('click',()=>{likelyOnly=!likelyOnly;likely.classList.toggle('active',likelyOnly);render();});const sb=qs('#saved-toggle');sb.classList.toggle('active',savedOnly);sb.addEventListener('click',()=>{savedOnly=!savedOnly;sb.classList.toggle('active',savedOnly);render();});
    const dt=qs('#diagnostics-toggle'),dp=qs('#diagnostics-panel');dt.addEventListener('click',()=>{const show=dp.hidden;dp.hidden=!show;dt.setAttribute('aria-expanded',String(show));dt.classList.toggle('active',show);updateDiagnostics();});qs('#run-benchmark').addEventListener('click',()=>{const b=window.OBMatcher.benchmark(visibleData(),profile,80);qs('#diag-benchmark').textContent=`${b.perEval.toFixed(4)} ms/eval · ${b.count.toLocaleString()} ops`;updateDiagnostics();});
    qs('.mobile-filter-button')?.addEventListener('click',()=>qs('.filter-panel').classList.toggle('mobile-open'));qs('.mobile-filter-close')?.addEventListener('click',()=>qs('.filter-panel').classList.remove('mobile-open'));
    qs('.modal-close')?.addEventListener('click',closeModal);qs('#opportunity-modal')?.addEventListener('click',e=>{if(e.target.id==='opportunity-modal')closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});document.addEventListener('ob:saved',render);
    const total=visibleData();qs('#discover-total').textContent=total.length;qs('#discover-open').textContent=total.filter(x=>['open','rolling'].includes(currentStatus(x))).length;syncProgress();render();
  }

  async function initHome(){
    const d=visibleData(); if(!d.length)return;
    qsa('[data-home-total]').forEach(x=>x.textContent=d.length+'+');
    qsa('[data-home-open]').forEach(x=>x.textContent=d.filter(o=>['open','rolling'].includes(currentStatus(o))).length);
    qsa('[data-program-count]').forEach(x=>x.textContent=d.length);
    const total=qs('#opportunity-count');if(total)total.textContent=d.length;
    const open=qs('#open-count');if(open)open.textContent=d.filter(o=>['open','rolling'].includes(currentStatus(o))).length;
    const floating=qs('#float-program-count');if(floating)floating.textContent=`${d.length} curated programs`;
    const newest=d.filter(x=>x.featured).slice(-3).reverse();
    const box=qs('#home-preview-list');if(box)box.innerHTML=newest.map(o=>`<div class="preview-list-item"><div class="preview-logo">${initials(o.organization)}</div><div><strong>${escapeHtml(o.name)}</strong><small>${statusLabel(currentStatus(o))} · ${escapeHtml(o.displayType)}</small></div></div>`).join('');
    const featured=qs('#featured-opportunities');
    if(featured){
      const items=d.filter(o=>['open','rolling','upcoming'].includes(currentStatus(o))).sort((a,b)=>(a.closesAt||'9999').localeCompare(b.closesAt||'9999')).slice(0,6);
      featured.innerHTML=items.map(o=>{const st=currentStatus(o);return `<article class="opportunity-card"><div class="card-top"><div class="org-avatar">${initials(o.organization)}</div><div class="card-title-wrap"><div class="org">${escapeHtml(o.organization)}</div><h3>${escapeHtml(o.name)}</h3></div></div><div class="card-status-row"><div class="card-tags"><span class="pill pill-${st}">${statusLabel(st)}</span><span class="tag">${escapeHtml(o.displayType)}</span></div></div><p class="card-summary">${escapeHtml(o.description)}</p><div class="card-meta"><div class="meta-box"><span><strong>${escapeHtml(o.closesAt?`Deadline ${formatDate(o.closesAt)}`:o.statusNote)}</strong><br>${escapeHtml(o.award)}</span></div></div><div class="verification-line"><span>Source-linked and checked</span></div><div class="card-actions"><a class="btn btn-secondary btn-sm" href="discover.html?program=${encodeURIComponent(o.id)}">Explore match</a><a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${o.sourceUrl}">Official site ↗</a></div></article>`}).join('');
    }
    const quick=qs('#quick-match-form');quick?.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams();q.set('stage',quick.elements.stage.value);q.set('interest',quick.elements.interest.value);location.href='discover.html?'+q;});
  }

  function initResources(){
    const list=qs('#resource-links');if(!list)return;
    const resources=[
      ['FAFSA / Federal Student Aid','Complete the FAFSA and review federal grants, work-study, and student-aid guidance.','https://studentaid.gov/'],
      ['Common App','College application platform used by many U.S. colleges and national scholarship programs.','https://www.commonapp.org/'],
      ['College Scorecard','Compare colleges using federal data on cost, graduation, debt, and earnings.','https://collegescorecard.ed.gov/'],
      ['QuestBridge Resource Library','Free guidance on college applications, financial aid, and paying for college.','https://www.questbridge.org/resources']
    ];
    list.innerHTML=resources.map(([name,description,url])=>`<div class="resource-item"><div class="resource-copy"><div class="resource-icon">${initials(name)}</div><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(description)}</p></div></div><a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="${url}">Open resource ↗</a></div>`).join('');
  }

  function initSources(){
    const list=qs('#source-list')||qs('#source-links');if(!list)return;let q='';
    const render=()=>{const rows=visibleData().filter(o=>(o.name+' '+o.organization+' '+o.displayType).toLowerCase().includes(q.toLowerCase()));const count=qs('#source-count');if(count)count.textContent=rows.length;const total=qs('#source-total');if(total)total.textContent=visibleData().length;const summary=qs('#source-summary');if(summary)summary.textContent=q?`${rows.length} source${rows.length===1?'':'s'} match your search`:`${rows.length} official program sources`;list.innerHTML=rows.map(o=>{const h=healthFor(o);if(list.id==='source-links')return `<div class="resource-item source-item"><div class="org-avatar">${initials(o.organization)}</div><div><h3>${escapeHtml(o.name)}</h3><div class="source-meta"><span>${escapeHtml(o.organization)}</span><span>${h.state==='verified'?'Source checked':'Needs review'}</span><span>${escapeHtml(o.statusNote)}</span></div></div><a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="${o.sourceUrl}">Official source ↗</a></div>`;return `<a class="source-row" target="_blank" rel="noopener" href="${o.sourceUrl}"><span class="source-index">${String(o.num).padStart(2,'0')}</span><div><h3>${escapeHtml(o.name)}</h3><p>${escapeHtml(o.organization)} · ${escapeHtml(o.statusNote)}</p></div><span class="source-status ${h.state==='verified'?'':'review'}">${h.state==='verified'?'Source checked':'Review'}</span></a>`}).join('');};
    qs('#source-search')?.addEventListener('input',e=>{q=e.target.value;render();});render();
  }

  document.addEventListener('DOMContentLoaded',()=>{initCommon();initHome();initResources();initSources();initDiscover();});
})();

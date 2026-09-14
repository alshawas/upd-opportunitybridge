(() => {
  const S = () => window.OB_SIGNALS || {};
  let wasm = null;
  let engine = 'JavaScript BigInt fallback';
  let wasmBytes = 0;
  const stats = { evaluations: 0, totalMs: 0, cacheHits: 0, cacheMisses: 0 };
  const vectorCache = new Map();

  function maskFromNames(names=[]) {
    const key = [...names].sort().join('|');
    if (vectorCache.has(key)) { stats.cacheHits++; return vectorCache.get(key); }
    stats.cacheMisses++;
    let m = 0n;
    const signals=S();
    for (const name of names) if (signals[name] !== undefined) m |= 1n << BigInt(signals[name]);
    vectorCache.set(key,m); return m;
  }
  function popcount(v){ let c=0; while(v){v&=v-1n;c++;} return c; }
  function fallback(profile,required,preferred,excluded,stageState,interestState){
    if ((profile & excluded)!==0n) return -1;
    const rt=popcount(required), rh=popcount(profile&required), pt=popcount(preferred), ph=popcount(profile&preferred);
    let score=44+(stageState>0?22:stageState<0?-22:0)+(interestState>0?18:interestState<0?-8:0);
    if(rt) score+=Math.floor(rh*8/rt); if(pt) score+=Math.floor(ph*16/pt);
    return Math.max(1,Math.min(99,score));
  }
  async function init(){
    try{
      const response=await fetch('matcher.wasm',{cache:'no-store'});
      if(!response.ok) throw new Error('wasm fetch '+response.status);
      const bytes=await response.arrayBuffer(); wasmBytes=bytes.byteLength;
      const instance=await WebAssembly.instantiate(bytes,{});
      wasm=instance.instance.exports; engine=`C++ / WebAssembly v${wasm.engine_version()}`;
    }catch(err){ wasm=null; engine='JavaScript BigInt fallback'; }
    return engine;
  }
  function explicitState(profileValue,allowed){
    if(!profileValue) return 0; return allowed.includes(profileValue)?1:-1;
  }
  function interestState(profileInterests,allowed){
    if(!profileInterests?.length) return 0;
    if(profileInterests.some(x=>allowed.includes(x))) return 1;
    return -1;
  }
  function restrictedState(profileValue,allowed){
    if(!allowed?.length || !profileValue) return 0;
    return allowed.includes(profileValue)?1:-1;
  }
  function applyRestrictedContext(score,locationState,institutionState){
    if(score<0) return score;
    score+=locationState>0?6:locationState<0?-30:0;
    score+=institutionState>0?10:institutionState<0?-35:0;
    return Math.max(1,Math.min(99,score));
  }
  function score(op,profile){
    const start=performance.now();
    const pm=maskFromNames(profile.signalNames||[]);
    const req=BigInt(op.requiredMask||0), pref=BigInt(op.preferredMask||0), exc=BigInt(op.excludedMask||0);
    const ss=explicitState(profile.stage,op.stages||[]);
    const is=interestState(profile.interests||[],op.interests||[]);
    const ls=restrictedState(profile.state,op.states||[]);
    const ns=restrictedState(profile.institution,op.institutions||[]);
    let raw;
    try { raw=wasm?wasm.match_score(pm,req,pref,exc,ss,is):fallback(pm,req,pref,exc,ss,is); }
    catch{ raw=fallback(pm,req,pref,exc,ss,is); }
    raw=applyRestrictedContext(raw,ls,ns);
    const elapsed=performance.now()-start; stats.evaluations++; stats.totalMs+=elapsed;
    const reasons=[];
    if(ss>0) reasons.push(profile.stage);
    const matchedInterests=(profile.interests||[]).filter(x=>(op.interests||[]).includes(x));
    if(matchedInterests.length) reasons.push(matchedInterests[0]);
    if(ls>0) reasons.push(profile.state);
    if(ns>0) reasons.push('your institution');
    const hitSignals=(op.preferredSignals||[]).filter(x=>(profile.signalNames||[]).includes(x));
    const labels={LOW_INCOME:'financial need',PELL:'Pell context',FIRST_GEN:'first-generation',LIMITED_ACCESS:'access barriers',WOMAN:'women-focused',GENDER_MINORITY:'gender-inclusive',BLACK:'Black students',HISPANIC:'Hispanic/Latino',AIAN:'Native students',LGBTQ:'LGBTQ+',COMMUNITY_COLLEGE:'community college',TRANSFER:'transfer',PRIOR_RESEARCH:'research experience',PHD_INTENT:'PhD interest',US_CITIZEN:'U.S. citizenship',PERMANENT_RESIDENT:'permanent resident'};
    for(const s of hitSignals){ const l=labels[s]; if(l&&!reasons.includes(l)) reasons.push(l); if(reasons.length>=3) break; }
    const explicitConflict=raw<0;
    return {score:explicitConflict?0:raw,reasons,explicitConflict,elapsed};
  }
  function metrics(){return {engine,wasmBytes,...stats,averageMs:stats.evaluations?stats.totalMs/stats.evaluations:0,cacheSize:vectorCache.size};}
  function benchmark(data,profile,rounds=120){
    const t0=performance.now(); let count=0;
    for(let r=0;r<rounds;r++) for(const op of data){score(op,profile);count++;}
    const total=performance.now()-t0; return {count,total,perEval:total/count};
  }
  window.OBMatcher={init,score,metrics,benchmark,maskFromNames};
})();

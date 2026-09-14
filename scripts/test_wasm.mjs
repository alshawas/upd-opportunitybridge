import fs from 'node:fs';
const bytes=fs.readFileSync(new URL('../matcher.wasm', import.meta.url));
const {instance}=await WebAssembly.instantiate(bytes,{});
const wasm=instance.exports;
function pop(v){let c=0;while(v){v&=v-1n;c++;}return c;}
function jsScore(profile,required,preferred,excluded,stageState,interestState){
  if((profile&excluded)!==0n)return -1;
  const rt=pop(required),rh=pop(profile&required),pt=pop(preferred),ph=pop(profile&preferred);
  let s=44+(stageState>0?22:stageState<0?-22:0)+(interestState>0?18:interestState<0?-8:0);
  if(rt)s+=Math.floor(rh*8/rt);if(pt)s+=Math.floor(ph*16/pt);return Math.max(1,Math.min(99,s));
}
let seed=0x12345678n;function rnd(){seed=(seed*6364136223846793005n+1442695040888963407n)&((1n<<64n)-1n);return seed;}
for(let i=0;i<2000;i++){
  const p=rnd(),r=rnd(),pr=rnd(),e=rnd()&rnd();const ss=Number(rnd()%3n)-1,is=Number(rnd()%3n)-1;
  const a=wasm.match_score(p,r,pr,e,ss,is),b=jsScore(p,r,pr,e,ss,is);if(a!==b)throw new Error(`mismatch ${i}: ${a} != ${b}`);
}
function adjustContext(score,locationState,institutionState){
  if(score<0)return score;
  score+=locationState>0?6:locationState<0?-30:0;
  score+=institutionState>0?10:institutionState<0?-35:0;
  return Math.max(1,Math.min(99,score));
}
const neutral=adjustContext(44,0,0),regionalMatch=adjustContext(44,1,0),regionalMismatch=adjustContext(44,-1,0),institutionMatch=adjustContext(44,0,1),institutionMismatch=adjustContext(44,0,-1);
if(!(regionalMatch>neutral && regionalMismatch<neutral && institutionMatch>neutral && institutionMismatch<neutral)){
  throw new Error('location/institution compatibility weights are not ordered correctly');
}
console.log('OK: C++/Wasm and JavaScript fallback agree on 2,000 randomized vectors.');

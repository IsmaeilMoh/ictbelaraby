'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const decision = require('../ict-decision-engine-708a.js');
const structure = require('../ict-structure-engine-702d.js');
const context = require('../ict-context-engine-703a.js');
const scenario = require('../ict-scenario-engine-703b.js');
const lifecycle = require('../ict-opportunity-lifecycle-708b.js');
const {contextAt, summarize} = require('./ict-unseen-market-replay.cjs');

const HOUR = 3600000;
const WINDOW = 24 * HOUR;
const frames = {'5':'5m','15':'15m'};
const root = path.join(__dirname, '..');

function loadEngines() {
  // Load the exact browser builds used by the opportunity center.
  const browser = vm.createContext({ICTStructureEngine: structure});
  for (const file of ['ict-signal-engine-702e.js','ict-composite-validation-704c2.js','ict-advanced-validation-704c4.js']) {
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),browser);
  }
  return browser;
}

function hourSetup(hourly, now) {
  const closed = hourly.filter(bar => bar.confirmed === true && bar.start + HOUR <= now).slice(-4);
  const recent = closed.at(-1);
  if (!recent || now >= recent.start + 2 * HOUR) return null;
  // Probe C2 reversal or C3/C4 continuation. This is a fixed research definition.
  for (const stage of [4,3,2]) {
    const tail = closed.slice(-stage);
    if (tail.length !== stage || tail.some((bar,i) => i && bar.start !== tail[i-1].start+HOUR)) continue;
    const [first, swing] = tail;
    const inside = swing.close > first.low && swing.close < first.high;
    const bull = swing.low < first.low, bear = swing.high > first.high;
    if (!inside || bull === bear) continue;
    const continues = tail.slice(2).every((bar,i) => bull
      ? bar.low > swing.low && bar.close > tail[i+1].close
      : bar.high < swing.high && bar.close < tail[i+1].close);
    if (!continues) continue;
    const anchor = tail.at(-1), adverseClose = bull ? anchor.close < anchor.open : anchor.close > anchor.open;
    const low = stage===2 && adverseClose && !bull ? anchor.close : anchor.low;
    const high = stage===2 && adverseClose && bull ? anchor.close : anchor.high;
    return {side:bull?'BUY':'SELL', stage,swingAt:swing.start, since:anchor.start+HOUR, eq:(low+high)/2};
  }
  return null;
}

function cisd(bars, side, ms, from) {
  const signal = bars.at(-1), prior = bars.at(-2);
  if (!signal || !prior || signal.start < from || signal.start !== prior.start+ms) return null;
  const bullish = side === 'BUY';
  const opposing = bar => bullish ? bar.close<bar.open : bar.close>bar.open;
  if (opposing(signal) || signal.close===signal.open || !opposing(prior)) return null;
  let i=bars.length-2;
  while (i>0 && bars[i-1].start===bars[i].start-ms && opposing(bars[i-1])) i--;
  if (i===0 || bars[i].start<from) return null; // The start of the opposing series must be known.
  const level=bars[i].open;
  if (bullish ? signal.close<=level : signal.close>=level) return null;
  const series=bars.slice(i);
  return {level,stop:bullish?Math.min(...series.map(bar=>bar.low)):Math.max(...series.map(bar=>bar.high)),at:signal.start+ms};
}

function assess(plan, at, bars, frame, end) {
  if (!lifecycle.valid({...plan,frame})) return {state:'no-levels',activationAt:null};
  const record=lifecycle.create({...plan,frame},at,{researchOnly:true,maxBars:WINDOW/structure.FRAME_MS[frame]});
  return lifecycle.advance(record,bars,Math.min(end,at+WINDOW));
}

function replay({symbol,market,bars,hourly,frame,split}, engines=loadEngines()) {
  const ms=structure.FRAME_MS[frame];
  const reports={selection:{baseline:[],annotated:[],fractal:[],combined:[]},
    validation:{baseline:[],annotated:[],fractal:[],combined:[]}};
  const seen=new Set(), swings=new Set();
  const end=bars.at(-1).start+ms;
  let cycles=0,alignedCycles=0;
  const confirmations=new Map();
  for(let i=29;i<bars.length;i++){
    const at=bars[i].start+ms;
    const period=at<split?'selection':'validation';
    const cutoff=period==='selection'?split:end;
    const prefix=bars.slice(Math.max(0,i-249),i+1);
    const future=bars.slice(i+1,i+1+WINDOW/ms);
    const session=contextAt(hourly,hourly,frame,at);
    const setup=hourSetup(session.candles60,at);
    const setupKey=setup&&setup.side+':'+setup.swingAt+':'+setup.stage;
    const trigger=setup&&cisd(prefix,setup.side,ms,setup.since-HOUR);
    if(trigger)confirmations.set(setupKey,trigger);
    const confirmation=confirmations.get(setupKey);
    const eqRespected=setup&&prefix.filter(bar=>bar.start>=setup.since).every(bar=>
      setup.side==='BUY'?bar.low>=setup.eq:bar.high<=setup.eq);
    cycles++;
    if(setup)alignedCycles++;
    const sample=decision.inspect({market,symbol,frame,now:at,candles15:prefix,...session,
      displayCompleteModels:true,includeIfvg:true,includeTurtleSoup:true,
      structureEngine:structure,signalEngine:engines.ICTSignalEngine,contextEngine:context,
      scenarioEngine:scenario,advancedEngine:engines.ICTAdvancedValidation4C4});
    const group=reports[period], baseline=sample.opportunities.filter(plan=>!seen.has(plan.id));
    for(const plan of baseline){
      seen.add(plan.id);
      const evidence=setup?.side===plan.side&&Boolean(confirmation)&&eqRespected;
      const outcome=assess(plan,at,future,frame,cutoff);
      group.baseline.push(outcome);
      group.combined.push(outcome);
      if(evidence)group.annotated.push(outcome);
    }
    if(!setup||!trigger||!eqRespected) continue;
    const key=setup.side+':'+setup.swingAt;
    if(swings.has(key))continue;
    const {level:entry,stop}=confirmation, risk=setup.side==='BUY'?entry-stop:stop-entry;
    if(risk<=0)continue;
    swings.add(key);
    const duplicate=sample.opportunities.some(plan=>plan.side===setup.side&&plan.zone&&entry>=plan.zone.low&&entry<=plan.zone.high);
    if(duplicate)continue;
    const target=entry+(setup.side==='BUY'?2:-2)*risk;
    const outcome=assess({id:'fractal:'+key,market,symbol,formedAt:at,side:setup.side,entry,stop,target},at,future,frame,cutoff);
    group.fractal.push(outcome);
    group.combined.push(outcome);
  }
  return {symbol,market,frame,cycles,alignedCycles,from:new Date(bars[0].start).toISOString(),
    split:new Date(split).toISOString(),through:new Date(end).toISOString(),
    periods:Object.fromEntries(Object.entries(reports).map(([period,group])=>[period,
      Object.fromEntries(Object.entries(group).map(([name,rows])=>[name,{
        ...summarize(rows),
        averageR:Object.fromEntries([0,0.05,0.1,0.2].map(cost=>{
          const settled=rows.filter(row=>Number.isFinite(row.outcomeR));
          return [cost,settled.length?Number((settled.reduce((sum,row)=>sum+row.outcomeR-cost,0)/settled.length).toFixed(3)):null];
        })),
        unpriced:rows.filter(row=>row.state==='no-levels').length,
        gaps:rows.filter(row=>row.state==='gap').length,expired:rows.filter(row=>row.state==='expired').length
      }]))]))};
}

function barsFor(rows, frame, asOf){
  if(!Array.isArray(rows))return [];
  return structure.normalize(rows.map(([date,open,high,low,close])=>
    ({start:Date.parse(date),open,high,low,close,confirmed:true})),frame,asOf).rows
    .map(row=>({...row,confirmed:true}));
}

function main(){
  const frame=process.argv[2]||'5', file=process.argv[3]||path.join(root,'historical-multi-market.json');
  if(!Object.hasOwn(frames,frame))throw Error('Usage: node ttrades-replay.cjs 5|15 [verified-archive.json]');
  const archive=JSON.parse(fs.readFileSync(file,'utf8')), asOf=Date.parse(archive.updatedAt);
  if(!archive.source||!Number.isFinite(asOf)||asOf>Date.now())throw Error('Missing verified archive source or cutoff');
  const results=[], unavailable=[];
  for(const [symbol,rows] of Object.entries(archive.assets||{})){
    const kind=archive.marketKinds?.[symbol],market=kind==='metal'?'metals':kind;
    const bars=barsFor(rows[frames[frame]],frame,asOf),hourly=barsFor(rows['1h'],'60',asOf);
    if(!market||bars.length<100||!hourly.length){unavailable.push(symbol);continue;}
    const split=bars[Math.floor(bars.length*0.6)].start;
    results.push(replay({symbol,market,bars,hourly,frame,split}));
  }
  console.log(JSON.stringify({source:archive.source,frame,unavailable,results},null,2));
}

if(require.main===module)main();
module.exports={hourSetup,cisd,assess,replay,barsFor};

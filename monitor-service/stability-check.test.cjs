'use strict';
const assert=require('node:assert/strict'),{sample}=require('./stability-check.cjs');
(async()=>{
 const healthy={serviceDataReady:true,issues:[],warnings:['EXECUTION_NOT_APPROVED'],marketSummary:{valid:1,configured:1}};
 const good=await sample('https://example.com',{count:3,intervalMs:0,check:async()=>healthy,sleep:async()=>{}});
 assert.equal(good.allPassed,true);assert.equal(good.executionApproved,false);
 let i=0;const bad=await sample('https://example.com',{count:3,intervalMs:0,check:async()=>{if(++i===2)throw Error('NETWORK_DOWN');return healthy},sleep:async()=>{}});
 assert.equal(bad.allPassed,false);assert.equal(bad.failed,1);assert.match(bad.snapshots[1].issues[0],/CONNECTIVITY_ERROR/);
 await assert.rejects(sample('x',{count:1}),/SAMPLE_COUNT/);
 console.log('8C.7 repeated health sampling: passed');
})().catch(e=>{console.error(e);process.exitCode=1});

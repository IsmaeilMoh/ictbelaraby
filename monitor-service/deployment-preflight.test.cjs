'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {preflight}=require('./deployment-preflight.cjs');
const actual=preflight(path.join(__dirname));assert.equal(actual.passed,true,JSON.stringify(actual));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ict-8c8-preflight-'));
try{
 for(const f of ['Dockerfile','compose.yaml','Caddyfile','package.json'])fs.copyFileSync(path.join(__dirname,f),path.join(dir,f));
 const failed=preflight(dir);assert.equal(failed.passed,false);assert.ok(failed.errors.some(x=>x.startsWith('MISSING_FILE safety-gates.js')));
 const docker=fs.readFileSync(path.join(dir,'Dockerfile'),'utf8').replace(' safety-gates.js execution-quotes.js','');
 fs.writeFileSync(path.join(dir,'Dockerfile'),docker);
 const broken=preflight(dir);assert.ok(broken.errors.includes('DOCKER_COPY_MISSING safety-gates.js'));
 console.log('8C.8 deployment preflight: passed');
}finally{fs.rmSync(dir,{recursive:true,force:true})}

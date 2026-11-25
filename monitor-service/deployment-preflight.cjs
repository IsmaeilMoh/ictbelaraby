'use strict';
/** Offline, fail-closed deployment preflight; does not need Docker or internet. */
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const required=[
 'server.js','package.json','safety-gates.js','execution-quotes.js','crypto-spot-backup.js',
 'ict-live-feed-702a.js','ict-public-markets-702c2.js',
 'ict_phase2d/ict-structure-engine-702d.js',
 'ict_phase2e/ict-signal-engine-702e.js',
 'Dockerfile','compose.yaml','Caddyfile'
];
function preflight(directory=root){
 const errors=[],warnings=[];
 for(const f of required){if(!fs.existsSync(path.join(directory,f)))errors.push('MISSING_FILE '+f)}
 const docker=fs.readFileSync(path.join(directory,'Dockerfile'),'utf8');
 const copyLines=docker.split('\n').filter(line=>/^COPY\s/.test(line.trim())).join(' ');
 for(const f of ['server.js','safety-gates.js','execution-quotes.js','crypto-spot-backup.js','ict-live-feed-702a.js','ict-public-markets-702c2.js']){
  if(!copyLines.split(/\s+/).includes(f))errors.push('DOCKER_COPY_MISSING '+f);
 }
 for(const folder of ['ict_phase2d','ict_phase2e'])if(!docker.includes('COPY '+folder))errors.push('DOCKER_COPY_MISSING '+folder);
 if(!docker.includes('USER node'))errors.push('CONTAINER_MUST_RUN_AS_NON_ROOT');
 if(!docker.includes('require(x)'))warnings.push('NO_IMAGE_BUILD_RUNTIME_IMPORT_CHECK');
 const compose=fs.readFileSync(path.join(directory,'compose.yaml'),'utf8');
 if(!compose.includes('read_only: true'))warnings.push('CONTAINER_ROOT_FILESYSTEM_NOT_READ_ONLY');
 if(!compose.includes('monitor-data:/data'))errors.push('PERSISTENT_VOLUME_MISSING');
 if(!compose.includes('ALLOWED_ORIGIN: https://ismaeilmoh.github.io'))errors.push('CORS_ORIGIN_NOT_EXPLICIT');
 if(compose.includes('8787:8787')||compose.includes('"8787:'))errors.push('MONITOR_HTTP_PORT_MUST_NOT_BE_PUBLIC');
 if(!compose.includes('MONITOR_DOMAIN'))errors.push('DOMAIN_ENV_NOT_DECLARED');
 const caddy=fs.readFileSync(path.join(directory,'Caddyfile'),'utf8');
 if(!caddy.includes('reverse_proxy monitor:8787'))errors.push('HTTPS_PROXY_MISSING');
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
 if(!manifest.scripts?.test)errors.push('TEST_SCRIPT_MISSING');
 for(const mod of ['server.js','safety-gates.js','execution-quotes.js','crypto-spot-backup.js']){
  try{require(path.join(directory,mod))}catch(e){errors.push('IMPORT_FAILED '+mod+': '+String(e.message).slice(0,160))}
 }
 return {schema:'ict-deployment-preflight/1',passed:errors.length===0,errors,warnings,checkedFiles:required.length,executionApproved:false};
}
if(require.main===module){const report=preflight(process.argv[2]?path.resolve(process.argv[2]):root);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;}
module.exports={preflight};

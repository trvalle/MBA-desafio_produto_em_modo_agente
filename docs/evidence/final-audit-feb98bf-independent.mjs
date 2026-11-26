import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD'),state=JSON.parse(readFileSync('docs/state.json'));
const histories=[];const features=[];let itemsTotal=0;
for(const f of state.features){
 const contract=readFileSync(`docs/features/${f.id}/contract.md`,'utf8');
 for(const doc of ['spec','plan','contract']){const text=readFileSync(`docs/features/${f.id}/${doc}.md`,'utf8');assert.ok(text.length>400);}
 const items=[...new Set(contract.match(/F\d{2}-(?:T|CF)\d{2}/g))];const report=readFileSync(f.latestReport,'utf8');
 assert.equal(f.status,'completed');for(const item of items)assert.ok(report.split('\n').some(l=>l.startsWith('|')&&l.includes(item)&&/\|\s*PASS\s*\|/.test(l)));
 assert.match(report,/Codex/);assert.match(report,/GPT-6/);assert.match(report,/contexto.*vazio|vazio.*contexto/);assert.match(report,/distinto/);assert.match(report,/2026-11-26/);
 features.push({id:f.id,items:items.length,report:f.latestReport,status:'PASS'});itemsTotal+=items.length;
 for(const file of readdirSync(`docs/features/${f.id}/reports`).filter(x=>x.endsWith('.md'))){const path=`docs/features/${f.id}/reports/${file}`;const commits=git('log','--format=%H','--',path).split('\n').filter(Boolean);assert.equal(commits.length,1,path);const s=readFileSync(path,'utf8').match(/\b[0-9a-f]{40}\b/)[0];git('cat-file','-e',s+'^{commit}');histories.push({path,commits,evaluatedCommit:s});}
}
const req=readFileSync('docs/requirements.md','utf8');const ids=[...req.matchAll(/^\| ([A-Z]+\d+) \|/gm)].map(x=>x[1]);const academic=ids.slice(0,ids.indexOf('END01')+1);assert.equal(academic.length,39);
const prd=readFileSync('docs/PRD.md','utf8');const allContracts=state.features.map(f=>readFileSync(`docs/features/${f.id}/contract.md`,'utf8')).join('\n');for(const id of new Set(prd.match(/F\d{2}-AC\d{2}|CF\d{2}/g)))assert.ok(allContracts.includes(id),id);
const runtimeDiff=git('diff','--name-only','2691761',sha,'--','src','public','scripts','tests','package.json','package-lock.json','Dockerfile','compose.yml','compose.yaml');assert.equal(runtimeDiff,'');
assert.equal(git('rev-parse','origin/main'),sha);const reportsRemoved=git('log','--all','--diff-filter=D','--format=%H','--','docs/features');assert.equal(reportsRemoved,'');
const result={at:new Date().toISOString(),sha,remote:git('rev-parse','origin/main'),features,itemsTotal,histories,academicIds:academic,academicCount:academic.length,runtimeDiff,reportsRemoved,verdict:'PASS'};
writeFileSync('/mnt/f/MBA/Catraca do brief ao produto em modo agente/docs/evidence/final-audit-feb98bf-independent.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
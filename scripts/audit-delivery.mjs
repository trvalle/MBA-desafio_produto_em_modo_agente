import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
const prd=read('docs/PRD.md');const state=JSON.parse(read('docs/state.json'));
const checks=[];const check=(name,fn)=>{try{fn();checks.push({name,status:'PASS'});}catch(error){checks.push({name,status:'FAIL',error:error.message});}};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
check('Entrega na main',()=>assert.equal(git('branch','--show-current'),'main'));
check('Seis features com artefatos completos',()=>{
  assert.equal(state.features.length,6);
  for(const feature of state.features)for(const file of ['spec.md','plan.md','contract.md'])assert.ok(existsSync(`docs/features/${feature.id}/${file}`));
});
const contracts=state.features.map(f=>read(`docs/features/${f.id}/contract.md`)).join('\n');
check('Todos critérios AC/CF mapeados a contratos',()=>{
  for(const id of new Set(prd.match(/F\d{2}-AC\d{2}|CF\d{2}/g)))assert.ok(contracts.includes(id),id);
  for(let n=1;n<=13;n++)assert.ok(prd.includes(`R${String(n).padStart(2,'0')}`));
});
check('Todos estados concluídos e últimos relatórios aprovados',()=>{
  for(const feature of state.features){
    assert.equal(feature.status,'completed',feature.id);assert.ok(feature.latestReport&&existsSync(feature.latestReport),feature.id);
    const report=read(feature.latestReport);const contract=read(`docs/features/${feature.id}/contract.md`);
    const items=[...new Set(contract.match(/F\d{2}-(?:T|CF)\d{2}/g))];
    for(const item of items){const line=report.split('\n').find(line=>line.startsWith('|')&&line.includes(item));assert.ok(line&&/\|\s*PASS\s*\|/.test(line),`${feature.id} ${item}`);}
    assert.match(report,/\b[0-9a-f]{40}\b/);assert.match(report,/Codex/);assert.match(report,/GPT-6/);
  }
});
check('Relatórios imutáveis e commits avaliados existentes',()=>{
  for(const f of state.features){const dir=`docs/features/${f.id}/reports`;if(!existsSync(dir))throw Error(dir);
    for(const file of readdirSync(dir).filter(f=>f.endsWith('.md'))){const path=`${dir}/${file}`;
      assert.equal(git('log','--format=%H','--',path).split('\n').filter(Boolean).length,1,path);
      const sha=read(path).match(/\b[0-9a-f]{40}\b/)?.[0];assert.ok(sha,path);git('cat-file','-e',`${sha}^{commit}`);
    }
  }
});
check('Links locais Markdown resolvem',()=>{
  // Inline relative document links, excluding shell examples, anchors and directory links allowed.
  const files=['README.md','AGENTS.md','docs/PRD.md','docs/requirements.md'];
  for(const f of state.features)files.push(`docs/features/${f.id}/contract.md`,f.latestReport);
  for(const path of files.filter(Boolean))for(const match of read(path).matchAll(/\]\(([^)]+)\)/g)){
    const target=match[1].split('#')[0];if(!target||/^[a-z]+:/.test(target))continue;
    const prefix=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'';assert.ok(existsSync(prefix+target),`${path}: ${target}`);
  }
});
check('Prova paralela com dois PRs mergeados e intervalos sobrepostos',()=>{
  const a=JSON.parse(execFileSync('gh',['pr','view','1','--json','commits,mergedAt,url'],{encoding:'utf8'}));
  const b=JSON.parse(execFileSync('gh',['pr','view','2','--json','commits,mergedAt,url'],{encoding:'utf8'}));
  assert.ok(a.mergedAt&&b.mergedAt);assert.ok(a.commits.length>=2&&b.commits.length>=2);
  assert.ok(a.commits[0].committedDate<b.commits.at(-1).committedDate);
  assert.ok(b.commits[0].committedDate<a.commits.at(-1).committedDate);
});
const result={sha:git('rev-parse','HEAD'),at:new Date().toISOString(),checks};
console.log(JSON.stringify(result,null,2));
if(process.env.AUDIT_OUTPUT)writeFileSync(process.env.AUDIT_OUTPUT,JSON.stringify(result,null,2));
if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;

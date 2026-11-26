import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=[];
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())walk(path);else if(/\.(m?js)$/.test(path))files.push(path);}}
for(const dir of ['src','public','scripts','tests'])walk(dir);
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Syntax: ${files.length} JavaScript modules checked.`);
const tests=readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>join('tests',f));
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...tests],{stdio:'inherit'});
process.exit(result.status||0);

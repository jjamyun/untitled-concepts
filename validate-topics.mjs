import fs from 'fs';
const t=JSON.parse(fs.readFileSync('topics.json','utf8'));
const seen=new Map(), dup=[];
for(const x of t){const k=(x.wikiTitle||'').trim().toLocaleLowerCase();if(seen.has(k))dup.push([seen.get(k),x.id,x.wikiTitle]);else seen.set(k,x.id);}
console.log(`topics=${t.length} canonicalUnique=${seen.size} duplicates=${dup.length}`);
if(dup.length){console.error(dup.slice(0,20));process.exit(1);}

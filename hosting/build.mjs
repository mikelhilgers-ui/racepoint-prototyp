import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stage=resolve(root,'.build','azure-'+Date.now());await mkdir(stage,{recursive:true});
const prefix='entwuerfe/codex-2026-10/';
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const appFiles=file=>file.startsWith('racepoint-app/')&&!file.startsWith('racepoint-app/server/');
const rootPages=new Set(['index.html','v8-aufbau.html','v9-3d-studio.html','v10-die-runde.html','v17-best-of.html']);
const extensions=new Set(['.html','.css','.js','.mjs','.json','.svg','.jpg','.png','.webp','.mp4','.glb','.woff2','.txt','.md','.gpx','.csv','.webmanifest']);
const publicFiles=tracked.filter(file=>(rootPages.has(file)||appFiles(file)||/^v17-[a-z0-9-]+\.html$/.test(file)||['assets/','vendor/',prefix+'prototype/assets/',prefix+'prototype/kombi/',prefix+'prototype/varianten/'].some(p=>file.startsWith(p)))&&(extensions.has(extname(file))||file.endsWith('/LICENSE'))&&!file.endsWith('/package.json'));
const backend=['agent.mjs','manufacturers.mjs','anthropic-stream.mjs','app-assistant.mjs'].map(file=>prefix+'server/'+file);
for(const file of [...publicFiles,...backend,'server.mjs','hosting/http.mjs','package.json']){
  const target=resolve(stage,file);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(root,file),target);
}
await writeFile(resolve(stage,'public-files.json'),JSON.stringify(publicFiles));
await writeFile(resolve(root,'.build','latest.json'),JSON.stringify({stage,publicFiles:publicFiles.length}));
console.log(JSON.stringify({stage,publicFiles:publicFiles.length}));

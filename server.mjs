import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRacepointServer} from './hosting/http.mjs';
import {agentStatus,runAgent} from './entwuerfe/codex-2026-10/server/agent.mjs';
import {appAssistantStatus,runAppAssistant} from './entwuerfe/codex-2026-10/server/app-assistant.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const publicFiles=JSON.parse(await readFile(new URL('./public-files.json',import.meta.url),'utf8'));
const origin=process.env.PUBLIC_ORIGIN||(process.env.WEBSITE_HOSTNAME?'https://'+process.env.WEBSITE_HOSTNAME:null);
if(!origin)throw Error('PUBLIC_ORIGIN muss für die öffentliche Vorschau gesetzt sein.');
const server=createRacepointServer({root,publicFiles,origin,agentStatus:()=>({...agentStatus(),appAssistant:appAssistantStatus()}),runAgent,runAppAssistant,maxDailyRequests:Number(process.env.AI_DAILY_REQUEST_LIMIT||100)});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Racepoint-Prototypen bereit.'));
process.on('SIGTERM',()=>server.close());

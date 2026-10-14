// Called with the authorized key in process memory. Never print settings or tokens.
import {execFileSync} from 'node:child_process';
const subscription='5c912878-dcbc-4419-96ad-da430e3864fd';
const key=process.env.ANTHROPIC_API_KEY||process.env.LIGNA_ASSISTENT_API_KEY;
if(!key)throw Error('Kein KI-Schlüssel in der Prozessumgebung vorhanden.');
const command='az account get-access-token --subscription '+subscription+' --resource https://management.azure.com/ --query accessToken --output tsv';
const token=execFileSync(command,{shell:true,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const endpoint='https://management.azure.com/subscriptions/'+subscription+'/resourceGroups/racepoint/providers/Microsoft.Web/sites/racepoint-prototypen/config/appsettings?api-version=2024-04-01';
const properties={ANTHROPIC_API_KEY:key,RACEPOINT_AI_MODEL:process.env.RACEPOINT_AI_MODEL||'claude-sonnet-5-5',PUBLIC_ORIGIN:'https://racepoint-prototypen.azurewebsites.net',AI_DAILY_REQUEST_LIMIT:'100',SCM_DO_BUILD_DURING_DEPLOYMENT:'false',NODE_ENV:'production'};
const response=await fetch(endpoint,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({properties})});
if(!response.ok)throw Error('Azure-App-Konfiguration fehlgeschlagen, HTTP '+response.status);
await response.body?.cancel();console.log('Azure-Konfiguration gespeichert; keine Schlüssel ausgegeben.');

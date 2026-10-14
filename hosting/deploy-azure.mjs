// Authentication stays in memory. Scope both ARM and deployment access to this app.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const subscription='5c912878-dcbc-4419-96ad-da430e3864fd';
const command='az account get-access-token --subscription '+subscription+' --resource https://appservice.azure.com --query accessToken --output tsv';
const token=execFileSync(command,{shell:true,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const base='https://racepoint-prototypen.scm.azurewebsites.net';
const headers={Authorization:'Bearer '+token};
if(process.argv.includes('--upload')){
  const {zip}=JSON.parse(await readFile(new URL('../.build/latest.json',import.meta.url),'utf8'));
  if(!zip)throw Error('Zuerst npm run build und hosting/package.ps1 ausführen.');
  const response=await fetch(base+'/api/zipdeploy?isAsync=true',{method:'POST',headers:{...headers,'Content-Type':'application/zip'},body:await readFile(zip),signal:AbortSignal.timeout(180000)});
  await response.body?.cancel();
  if(!response.ok)throw Error('Upload fehlgeschlagen, HTTP '+response.status);
  console.log('Upload angenommen. Status mit node hosting/deploy-azure.mjs prüfen.');
}else{
  const response=await fetch(base+'/api/deployments',{headers,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Deploymentstatus nicht erreichbar, HTTP '+response.status);
  const deployments=await response.json();
  console.log(JSON.stringify(deployments.slice(0,3).map(d=>({id:d.id,status:d.status,complete:d.complete,active:d.active}))));
  console.log('Status 4 = erfolgreich, Status 3 = fehlgeschlagen.');
}

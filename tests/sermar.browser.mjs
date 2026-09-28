// Native browser verification: node tests/sermar.browser.mjs <browser.exe> [reference-directory]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [browser,fixtures,page='sermar.browser.html']=process.argv.slice(2);
if(!browser) throw Error('Provide a Chromium/Edge executable path.');
const server=http.createServer((req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname);
  const base=relative.startsWith('/fixtures/') && fixtures ? path.resolve(fixtures) : root;
  const file=path.resolve(base,'.'+(base===root?relative:relative.replace('/fixtures','')));
  if(!file.startsWith(base+path.sep)) throw Error('outside root');
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'text/plain');
  res.end(fs.readFileSync(file));
 } catch {res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'windyvr-sermar-'));
const child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=10000','http://127.0.0.1:'+server.address().port+'/tests/'+page+(fixtures?'?fixtures=1':'')],{windowsHide:true});
let output='',errors='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>errors+=d);
const timeout=setTimeout(()=>child.kill(),45000);
try {
 await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 const result=output.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];
 console.log(result||errors.slice(-3000));
 if(!result?.startsWith('PASS')) process.exitCode=1;
} finally {clearTimeout(timeout);server.close();}

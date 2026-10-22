import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {Chess} from 'chess.js';

const curriculum=JSON.parse(await fs.readFile(process.argv[2]||'data/lesson-curriculum.json','utf8'));
const reportFile=process.argv[3]||'data/lesson-import-report.json';
const onlyMissing=process.argv.includes('--only-missing');
const entries=curriculum.sections.flatMap(section=>section.courses.flatMap(course=>course.lessons.map(lesson=>({...lesson,section:{id:section.id,name:section.name,level:section.level,color:section.color,order:section.order},course:{id:course.id,name:course.name,path:course.path,order:course.order}}))));
const entities={quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'};
const decode=value=>value.replace(/&#x([0-9a-f]+);|&#(\d+);|&(quot|apos|amp|lt|gt);/gi,(_,hex,decimal,named)=>hex?String.fromCodePoint(parseInt(hex,16)):decimal?String.fromCodePoint(Number(decimal)):entities[named]);
await fs.mkdir('.analysis-tools/lesson-cache',{recursive:true});
await fs.mkdir('data/lessons',{recursive:true});
const report={source:curriculum.sourceUrl,scope:curriculum.scope,note:curriculum.note,capturedAt:new Date().toISOString(),imported:[],unavailable:[]};
async function download(url,output){return new Promise((resolve,reject)=>{const process=spawn('curl.exe',['--fail','--silent','--show-error','--location','--max-time','25','--user-agent','Mozilla/5.0',url,'--output',output],{windowsHide:true});let stderr='';process.stderr.on('data',chunk=>{stderr+=chunk;});process.on('error',reject);process.on('close',code=>code===0?resolve():reject(new Error(stderr.trim())));});}
async function importOne(entry){
 const key=entry.course.path+'--'+entry.path;
 if(!/^[a-z0-9-]+$/.test(key))throw new Error('Chemin de leçon invalide');
 const file='data/lessons/'+entry.path+'.json',cache='.analysis-tools/lesson-cache/'+key+'.html';
 try{
  if(onlyMissing){
   let existing;try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
   if(existing){
    if(existing.sourceLesson.id!==entry.id&&(existing.sourceLesson.path!==entry.path||existing.sourceLesson.course.path!==entry.course.path))throw new Error('Une autre leçon utilise déjà ce nom de fichier');
    report.imported.push({path:entry.path,title:existing.title,file,exercises:existing.exercises.length,number:entry.number,existing:true});return;
   }
  }
  let html;try{html=await fs.readFile(cache,'utf8');}catch{await download(entry.sourceUrl,cache);html=await fs.readFile(cache,'utf8');}
  const match=html.match(/data-lesson\s*=\s*(['"])([\s\S]*?)\1/);
  if(!match)throw new Error('Pas de données de leçon dans la page publique');
  const sourceLesson=JSON.parse(decode(match[2]));
  if(sourceLesson.path!==entry.path||sourceLesson.course?.path!==entry.course.path)throw new Error('La page téléchargée ne correspond pas à la leçon attendue');
  if(!sourceLesson.questions?.length)throw new Error('Aucun exercice exportable');
  const exercises=sourceLesson.questions.map(pgn=>{
   const fen=pgn.match(/\[FEN "([^"]+)"\]/)?.[1]||new Chess().fen();
   return {fen,challengeType:pgn.match(/\[LESSON_CHALLENGE_TYPE "([^"]+)"\]/)?.[1]||'',targets:pgn.match(/\[LESSON_STAR_LOCATIONS "([^"]+)"\]/)?.[1]||'',comments:[...pgn.matchAll(/\{([^}]*)\}/g)].map(m=>m[1]),pgn};
  });
  const data={schemaVersion:1,sourceUrl:entry.sourceUrl,capturedAt:new Date().toISOString(),title:sourceLesson.name,exercises,sourceLesson,curriculum:{number:entry.number,order:entry.order,section:entry.section,course:entry.course}};
  await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
  report.imported.push({path:entry.path,title:data.title,file,exercises:exercises.length,number:entry.number});
 }catch(error){report.unavailable.push({path:entry.path,title:entry.title,sourceUrl:entry.sourceUrl,number:entry.number,reason:error.message});}
}
let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<entries.length){const index=next++;await importOne(entries[index]);if((index+1)%15===0)console.log(`${index+1}/${entries.length} pages examinées`);}}));
report.imported.sort((a,b)=>a.number-b.number);report.unavailable.sort((a,b)=>a.number-b.number);
await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
const types={};for(const entry of report.imported){const data=JSON.parse(await fs.readFile(entry.file,'utf8'));for(const ex of data.exercises)types[ex.challengeType||'moves']=(types[ex.challengeType||'moves']||0)+1;}
console.log(JSON.stringify({imported:report.imported.length,unavailable:report.unavailable.length,exercises:report.imported.reduce((n,l)=>n+l.exercises,0),types,failures:report.unavailable.slice(0,8)},null,2));

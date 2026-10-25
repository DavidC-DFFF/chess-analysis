import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Chess} from 'chess.js';
import {compileExercise} from './compile-lesson.mjs';

const courseUrl='https://www.chess.com/lessons/learn-the-openings';
const root='exports/learn-the-openings';
const cache='.analysis-tools/opening-course-cache';
await fs.mkdir(root,{recursive:true});await fs.mkdir(cache,{recursive:true});
async function download(url,file){
 return new Promise((resolve,reject)=>{
  const process=spawn('curl.exe',['--fail','--silent','--show-error','--location','--max-time','30','--user-agent','Mozilla/5.0',url,'--output',file],{windowsHide:true});
  let error='';process.stderr.on('data',chunk=>{error+=chunk;});process.on('error',reject);process.on('close',code=>code===0?resolve():reject(new Error(error.trim())));
 });
}
async function page(url,file){try{return await fs.readFile(file,'utf8');}catch{await download(url,file);return fs.readFile(file,'utf8');}}
const course=await page(courseUrl,'.analysis-tools/learn-the-openings-course.html');
const urls=[...new Set(course.match(/https:\/\/www\.chess\.com\/lessons\/learn-the-openings\/[a-z0-9-]+/g)||[])];
if(!urls.length)throw new Error('Aucune leçon trouvée dans le cours');
const entities={quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'};
const decode=value=>value.replace(/&#x([0-9a-f]+);|&#(\d+);|&(quot|apos|amp|lt|gt);/gi,(_,hex,n,named)=>hex?String.fromCodePoint(parseInt(hex,16)):n?String.fromCodePoint(Number(n)):entities[named]);
const results=[];let next=0;
async function extract(url,order){
 const slug=url.split('/').at(-1);
 try{
  const html=await page(url,path.join(cache,slug+'.html'));
  const match=html.match(/data-lesson\s*=\s*(['"])([\s\S]*?)\1/);
  if(!match)throw new Error('La page ne contient pas de données de leçon accessibles');
  const source=JSON.parse(decode(match[2]));
  if(source.path!==slug||source.course?.path!=='learn-the-openings')throw new Error('La page ne correspond pas à la leçon attendue');
  if(!source.questions?.length)throw new Error('Aucun exercice exportable');
  const dir=path.join(root,slug);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'source.json'),JSON.stringify({sourceUrl:url,capturedAt:new Date().toISOString(),lesson:source},null,2)+'\n');
  await fs.writeFile(path.join(dir,'exercises.pgn'),source.questions.join('\n\n')+'\n');
  const compiled=[],failures=[];
  for(const [index,pgn]of source.questions.entries()){
   const fen=pgn.match(/\[FEN "([^"]+)"\]/)?.[1]||new Chess().fen();
   const exercise={fen,pgn,challengeType:pgn.match(/\[LESSON_CHALLENGE_TYPE "([^"]+)"\]/)?.[1]||'',targets:pgn.match(/\[LESSON_STAR_LOCATIONS "([^"]+)"\]/)?.[1]||'',comments:[...pgn.matchAll(/\{([^}]*)\}/g)].map(m=>m[1])};
   try{compiled.push({number:index+1,...compileExercise(exercise)});}catch(error){failures.push({number:index+1,reason:error.message});}
  }
  await fs.writeFile(path.join(dir,'playback.json'),JSON.stringify({sourceUrl:url,exercises:compiled,unavailable:failures},null,2)+'\n');
  results.push({order,title:source.name,path:slug,sourceUrl:url,exercises:source.questions.length,playable:compiled.length,comments:source.questions.reduce((n,pgn)=>n+[...pgn.matchAll(/\{[^}]*\}/g)].length,0),warnings:compiled.reduce((n,e)=>n+(e.warnings?.length||0),0),mainMoves:compiled.reduce((n,e)=>n+(e.line?.length||0),0),hasVideoReference:Boolean(source.videoUrl),failures});
 }catch(error){results.push({order,path:slug,sourceUrl:url,error:error.message});}
}
await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){const index=next++;await extract(urls[index],index+1);if((index+1)%10===0)console.log(`${index+1}/${urls.length} leçons examinées`);}}));
results.sort((a,b)=>a.order-b.order);
const extracted=results.filter(r=>!r.error);
const summary={lessonsListed:urls.length,lessonsExtracted:extracted.length,exercises:extracted.reduce((n,l)=>n+l.exercises,0),playableExercises:extracted.reduce((n,l)=>n+l.playable,0),comments:extracted.reduce((n,l)=>n+l.comments,0),mainMoves:extracted.reduce((n,l)=>n+l.mainMoves,0),unavailable:results.filter(r=>r.error)};
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({sourceUrl:courseUrl,capturedAt:new Date().toISOString(),summary,lessons:results},null,2)+'\n');
const report=['# Export des ouvertures Chess.com','',`Source : [Learn Every Chess Opening](${courseUrl}).`,'',`${summary.lessonsExtracted}/${summary.lessonsListed} leçons extraites, ${summary.exercises} exercices, ${summary.comments} commentaires et ${summary.mainMoves} coups dans les lignes principales compilées.`,'','Chaque dossier conserve les données intégrées à la page dans `source.json`, tous les exercices et variantes dans `exercises.pgn`, et une version structurée pour le lecteur dans `playback.json`. Les avertissements ou exercices non compilables sont recensés ; le PGN source reste conservé intégralement.','',"Les textes sont conservés dans la langue de la page source. Les références vidéo sont conservées comme métadonnées ; les fichiers vidéo et leur narration ne sont pas exportés. Les exercices ne représentent donc pas nécessairement tout le contenu théorique présenté dans la vidéo.",'','La bibliothèque et le répertoire de chess-analysis ne sont pas modifiés par cet export.','','| Ordre du cours | Leçon | Exercices | Compilés | Avertissements PGN |','|---|---|---|---|---|',...results.map(l=>`| ${l.order} | [${l.title||l.path}](${l.path}/source.json) | ${l.exercises??'—'} | ${l.playable??'—'} | ${l.error||l.failures.length||l.warnings||0} |`),''];
await fs.writeFile(path.join(root,'README.md'),report.join('\n'));
console.log(JSON.stringify(summary,null,2));

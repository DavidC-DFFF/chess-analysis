import fs from 'node:fs';
import {Chess} from 'chess.js';
import {compileExercise} from './compile-lesson.mjs';

export function embedOpeningCourses(html){
 const source=JSON.parse(fs.readFileSync(new URL('../data/opening-courses.json',import.meta.url),'utf8'));
 const courses=source.map(course=>({...course,questions:undefined,imported:true,start:0,lines:course.questions.map((pgn,index)=>{
  const fen=pgn.match(/\[FEN "([^"]+)"\]/)?.[1]||new Chess().fen();
  const exercise=compileExercise({fen,pgn,comments:[]});
  return {name:`Exercice ${index+1}`,first:'',summary:exercise.prompt,prompt:exercise.prompt,fen,userColor:fen.split(' ')[1],moves:exercise.line.map(node=>({...node,uci:node.from+node.to+(node.promotion||''),note:node.comment||'Poursuis la ligne étudiée.'}))};
 })}));
 const data=JSON.stringify(courses).replaceAll('<','\\u003c');
 const marker=/(<script type="application\/json" id="opening-course-data">)[\s\S]*?(<\/script>)/;
 if(!marker.test(html))html=html.replace('<script>','<script type="application/json" id="opening-course-data"></script>\n<script>');
 html=html.replace(marker,(_,open,close)=>open+data+close);
 const runtime=fs.readFileSync(new URL('../src/opening-courses.js',import.meta.url),'utf8');
 const runtimeMarker=/(\/\/ BEGIN OPENING COURSES)[\s\S]*?(\/\/ END OPENING COURSES)/;
 if(!runtimeMarker.test(html))html=html.replace('const files="abcdefgh";', 'const files="abcdefgh";\n// BEGIN OPENING COURSES\n// END OPENING COURSES');
 html=html.replace(runtimeMarker,(_,start,end)=>start+'\n'+runtime+'\n'+end);
 return html;
}

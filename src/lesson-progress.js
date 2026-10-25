// Keep the best completed attempt for each exercise, alongside the current run.
class LessonProgress {
 constructor(storage){this.storage=storage;this.completed=this.read('chess-analysis.lesson-progress');this.results=this.read('chess-analysis.lesson-results');this.navigation=this.read('chess-analysis.lesson-navigation');}
 read(key){try{const data=JSON.parse(this.storage?.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
 write(key,data){try{this.storage?.setItem(key,JSON.stringify(data));}catch{}}
 key(lesson){return lesson.sourceLesson.path;}
 record(lesson){const value=this.results[this.key(lesson)];return value&&typeof value==='object'&&!Array.isArray(value)?value:{started:false,exercises:{}};}
 exerciseResults(lesson){const value=this.record(lesson).exercises;return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
 restore(session){const value=this.completed[this.key(session.lesson)];session.completed=new Set((Array.isArray(value)?value:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<session.lesson.exercises.length));}
 visit(lesson){const recent=Array.isArray(this.navigation.recent)?this.navigation.recent:[];this.navigation={recent:[this.key(lesson),...recent.filter(key=>typeof key==='string'&&key!==this.key(lesson))].slice(0,500)};this.write('chess-analysis.lesson-navigation',this.navigation);}
 resume(orderedLessons){
  const recent=Array.isArray(this.navigation.recent)?this.navigation.recent:[];
  const nonGreen=lesson=>this.status(lesson).state!=='perfect';
  for(const key of recent){const lesson=orderedLessons.find(l=>this.key(l)===key);if(lesson&&nonGreen(lesson))return lesson;}
  for(const key of Object.keys(this.results).reverse()){const lesson=orderedLessons.find(l=>this.key(l)===key);if(lesson&&this.record(lesson).started&&nonGreen(lesson))return lesson;}
  const lastIndex=orderedLessons.findIndex(l=>this.key(l)===recent[0]);
  return orderedLessons.slice(lastIndex+1).find(nonGreen)||orderedLessons.find(nonGreen)||orderedLessons[0];
 }
 reset(lesson){delete this.completed[this.key(lesson)];delete this.results[this.key(lesson)];this.write('chess-analysis.lesson-progress',this.completed);this.write('chess-analysis.lesson-results',this.results);}
 start(lesson){this.visit(lesson);this.results[this.key(lesson)]={...this.record(lesson),started:true};this.write('chess-analysis.lesson-results',this.results);}
 save(session){
  const lesson=session.lesson,key=this.key(lesson);
  this.completed[key]=[...session.completed];this.write('chess-analysis.lesson-progress',this.completed);
  if(!session.solved)return;
  const exercises={...this.exerciseResults(lesson)},previous=exercises[session.index];
  const clean=session.mistakes===0&&!session.hinted;
  if(previous?.clean!==true)exercises[session.index]={clean,mistakes:session.mistakes,hinted:session.hinted};
  this.results[key]={started:true,exercises};this.write('chess-analysis.lesson-results',this.results);
 }
 status(lesson){
  const exercises=this.exerciseResults(lesson),legacy=this.completed[this.key(lesson)];
  const indexes=Array.isArray(legacy)?legacy:[];
  let done=0,perfect=0;
  for(let i=0;i<lesson.exercises.length;i++){
   if(exercises[i]?.clean===true){done++;perfect++;}
   else if(exercises[i]?.clean===false||indexes.includes(i))done++;
  }
  if(perfect===lesson.exercises.length)return {state:'perfect',label:'✓ 100 % · sans erreur ni indice'};
  if(done===lesson.exercises.length){
   const detailed=Object.values(exercises).some(result=>result?.clean===false);
   return {state:'completed',label:detailed?'● 100 % · avec erreurs ou aide':'● 100 % · ancien résultat non détaillé'};
  }
  if(done||this.record(lesson).started)return {state:'progress',label:`En cours · ${done}/${lesson.exercises.length}`};
  return {state:'new',label:''};
 }
}
globalThis.LessonProgress=LessonProgress;

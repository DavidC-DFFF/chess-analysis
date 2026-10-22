import fs from 'node:fs';
const html=fs.readFileSync('.analysis-tools/chesscom-learn-fr.html','utf8');
const match=html.match(/learnGuide\.userLearnPath\s*=\s*JSON\.parse\('([^']*)'\)/);
if(!match)throw new Error('Parcours absent de la page');
const path=JSON.parse(JSON.parse('"'+match[1]+'"'));
const levels={SECTION_LEVEL_NEW:{name:'Apprendre à jouer',color:'lime'},SECTION_LEVEL_BEGINNER:{name:'Débutant',color:'green'},SECTION_LEVEL_INTERMEDIATE:{name:'Intermédiaire',color:'orange'},SECTION_LEVEL_ADVANCED:{name:'Avancé',color:'purple'}};
const manifest={sourceUrl:'https://www.chess.com/fr/learn',scope:'Ordre du parcours public ; les états de déblocage du compte ne sont pas disponibles.',requestedThrough:'tempo-aux-echecs',throughFound:false,sections:[]};
let found=false,total=0;
for(const [sectionIndex,section]of path.sections.entries()){
 const entry={id:section.id,...levels[section.level],level:section.level,order:sectionIndex+1,courses:[]};
 manifest.sections.push(entry);
 for(const [courseIndex,course]of section.courses.entries()){
  const group={id:course.id,name:course.name,path:course.path,order:courseIndex+1,lessons:[]};entry.courses.push(group);
  for(const [lessonIndex,lesson]of course.lessons.entries()){
   group.lessons.push({id:lesson.id,title:lesson.name,path:lesson.path,order:lessonIndex+1,number:++total,sourceUrl:`https://www.chess.com/fr/lessons/${course.path}/${lesson.path}`});
   if(lesson.path===manifest.requestedThrough){found=true;break;}
  }
  if(found)break;
 }
 if(found)break;
}
manifest.throughFound=found;
if(!found)manifest.note='La page publique expose un parcours différent : Tempo n’y figure pas. Les leçons publiques sont inventoriées sans prétendre reproduire les déblocages du compte.';
fs.writeFileSync('data/lesson-curriculum.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({total,sections:manifest.sections.map(s=>({name:s.name,level:s.level,courses:s.courses.map(c=>({name:c.name,path:c.path,lessons:c.lessons.length}))}))},null,2));

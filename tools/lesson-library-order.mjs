// One learning progression, independent of where a lesson was imported from.
// Keep each course's internal order; introduce a topic before its deeper practice.
const courseOrder = {
 SECTION_LEVEL_NEW: ['apprendre-a-jouer-aux-echecs'],
 SECTION_LEVEL_BEGINNER: ['jouer-aux-echecs','jouer','principes-ouverture','gagner-la-partie','capturer-les-pieces-adverses','attaquer-le-roi-adverse','introduction-au-ouvertures-classiques','mes-parties'],
 SECTION_LEVEL_INTERMEDIATE: ['ouvertures-echecs','tactiques-echecs','gagner-grace-a-la-tactique','les-coups-forces','strategie-echecs','utiliser-le-potentiel-de-ses-pieces','lecture-de-l-echiquier','finales-echecs','comprendre-les-finales'],
 SECTION_LEVEL_ADVANCED: ['ouvertures-avancees','les-ouvertures-cles','choisir-le-meilleur-coup','activer-ses-pieces','strategie-avancee','attaquer-le-roi','tactiques-echecs-avancees','tactiques-avancees','finales-avancees','motifs-de-finales'],
};

export function orderLessonLibrary(lessons, personalManifest) {
 const personalEntries=new Map(personalManifest.sections.flatMap(section=>section.courses.flatMap(course=>course.lessons.map(lesson=>[course.path+'/'+lesson.path,{order:lesson.order,section:{name:section.name,level:section.level,color:section.color,order:section.order},course:{name:course.name,path:course.path,order:course.order}}]))));
 const ordered=lessons.map(lesson=>{
  const source=personalEntries.get(lesson.sourceLesson.course.path+'/'+lesson.sourceLesson.path)||lesson.curriculum;
  if(!source)throw new Error('Classement absent : '+lesson.title);
  const courses=courseOrder[source.section.level];
  const courseIndex=courses?.indexOf(source.course.path);
  if(courseIndex===undefined||courseIndex<0)throw new Error('Cours non classé : '+source.course.path);
  return {...lesson,libraryCurriculum:{...source,course:{...source.course,order:courseIndex+1}}};
 }).sort((a,b)=>a.libraryCurriculum.section.order-b.libraryCurriculum.section.order||a.libraryCurriculum.course.order-b.libraryCurriculum.course.order||a.libraryCurriculum.order-b.libraryCurriculum.order);
 return ordered.map((lesson,index)=>({...lesson,libraryCurriculum:{...lesson.libraryCurriculum,number:index+1}}));
}

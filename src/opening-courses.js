const openingCourses=JSON.parse(document.getElementById('opening-course-data').textContent);
function courseMoves(line){return line.map(node=>({...node,uci:node.from+node.to+(node.promotion||''),note:node.comment||'Poursuis la ligne étudiée.'}));}
function setupOpeningCourses(){
 document.getElementById('feedback').after(document.getElementById('course-source'));
 const select=document.getElementById('course-select');
 for(const family of ['Jeux ouverts · 1.e4 e5','Défense sicilienne','Défenses semi-ouvertes · 1.e4','Jeux fermés et défenses · 1.d4','Ouvertures de flanc']){
  const group=document.createElement('optgroup');group.label=family;
  for(const course of openingCourses.filter(c=>c.family===family)){const option=document.createElement('option');option.value=course.id;option.textContent=course.name;group.append(option);}
  select.append(group);
 }
 select.addEventListener('change',selectPractice);
}

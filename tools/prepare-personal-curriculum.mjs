import fs from 'node:fs';

const html = fs.readFileSync(process.argv[2], 'utf8');
const match = html.match(/learnGuide\.userLearnPath\s*=\s*JSON\.parse\('([^']*)'\)/);
if (!match) throw new Error('Parcours absent de la page enregistrée');
const source = JSON.parse(JSON.parse('"' + match[1] + '"'));
const publicManifest = JSON.parse(fs.readFileSync('data/lesson-curriculum.json', 'utf8'));
let number = 0;
const sections = source.sections.map((section, si) => {
  const level = publicManifest.sections.find(s => s.level === section.level);
  if (!level) throw new Error('Niveau inconnu : ' + section.level);
  return {id: section.id, name: level.name, color: level.color, level: section.level, order: si + 1,
    courses: section.courses.map((course, ci) => ({id: course.id, name: course.name, path: course.path, order: ci + 1,
      lessons: course.lessons.flatMap((lesson, li) => {
        if (lesson.status === 'LESSON_TILE_STATUS_LOCKED') return [];
        if (!['LESSON_TILE_STATUS_COMPLETED', 'LESSON_TILE_STATUS_NOT_COMPLETED'].includes(lesson.status)) throw new Error('Statut inconnu');
        return [{id: lesson.id, title: lesson.name, path: lesson.path, order: li + 1, number: ++number,
          sourceUrl: `https://www.chess.com/fr/lessons/${course.path}/${lesson.path}`}];
      })})).filter(c => c.lessons.length)};
}).filter(s => s.courses.length);
const manifest = {sourceUrl: 'https://www.chess.com/learn', scope: 'Leçons débloquées du parcours personnel, selon la page enregistrée. Instantané sans synchronisation du compte.', sections};
fs.writeFileSync('data/personal-lesson-curriculum.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`${number} leçons débloquées classées dans le parcours personnel.`);

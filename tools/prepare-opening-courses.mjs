import fs from 'node:fs';
const root='exports/learn-the-openings';
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
const names=['Partie italienne','Défense des Deux Cavaliers','Gambit Evans','Espagnole · défense de Berlin','Espagnole · attaque Marshall','Espagnole · variante fermée','Espagnole · systèmes atypiques','Sicilienne · Najdorf','Sicilienne · Rossolimo et Moscou','Sicilienne · Sveshnikov','Sicilienne · Dragon','Sicilienne · systèmes avec 2…e6','Sicilienne · Alapine','Sicilienne fermée','Gambit dame refusé','Gambit dame · variante d’échange','Gambit dame accepté','Gambit dame · variante Ff4','Gambit dame · Cambridge Springs et orthodoxe','Défense nimzo-indienne','Systèmes de Londres et Colle','Défense française · 3.Cc3','Défense française · Tarrasch et avance','Défense Caro-Kann','Ouverture anglaise','Défense slave','Défense semi-slave','Défense est-indienne','Partie écossaise','Ouverture catalane','Défense scandinave','Défense Petrov','Partie des Quatre Cavaliers','Défense Grünfeld','Partie viennoise et début du fou','Défense ouest-indienne','Défense Bogo-indienne','Défense Benoni','Gambit Benko','Défenses Pirc et moderne','Défense hollandaise','Défense Alekhine','Attaques Trompowsky et Torre','Attaque est-indienne et ouverture Réti','Partie du centre et gambit danois','Gambit du roi','Ouvertures de flanc','Défenses indiennes et tango des cavaliers','Défense de Budapest','Défense vieille-indienne'];
function family(index){
 if([1,2,3,4,5,6,7,29,32,33,35,45,46].includes(index))return 'Jeux ouverts · 1.e4 e5';
 if(index>=8&&index<=14)return 'Défense sicilienne';
 if([22,23,24,31,40,42].includes(index))return 'Défenses semi-ouvertes · 1.e4';
 if([25,44,47].includes(index))return 'Ouvertures de flanc';
 return 'Jeux fermés et défenses · 1.d4';
}
if(manifest.lessons.length!==names.length)throw new Error('Catalogue de cours modifié');
const courses=manifest.lessons.map((entry,index)=>{
 const source=JSON.parse(fs.readFileSync(`${root}/${entry.path}/source.json`,'utf8')).lesson;
 return {id:entry.path,name:names[index],family:family(index+1),order:index+1,sourceUrl:entry.sourceUrl,sourceTitle:source.name,description:source.description,questions:source.questions};
});
fs.writeFileSync('data/opening-courses.json',JSON.stringify(courses,null,2)+'\n');
console.log(`${courses.length} cours et ${courses.reduce((n,c)=>n+c.questions.length,0)} exercices préparés.`);

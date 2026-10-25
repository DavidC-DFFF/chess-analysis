
class TempoLesson {
  constructor(lesson) {this.lesson=lesson;this.completed=new Set();this.load(0);}
  load(index) {
    if(!Number.isInteger(index)||index<0||index>=this.lesson.exercises.length)throw new Error('Exercice inconnu');
    this.index=index;this.game=new LessonChess(this.lesson.exercises[index].fen,{skipValidation:true});
    this.userColor=this.game.turn();this.line=this.lesson.exercises[index].line;this.cursor=0;this.moves=0;this.mistakes=0;this.hinted=false;this.solved=false;this.targets=new Set();this.lastMove=null;this.syncBoard();
  }
  syncBoard(){this.board={};for(const piece of this.game.board().flat().filter(Boolean))this.board[piece.square]=piece.color==='w'?piece.type.toUpperCase():piece.type;}
  get waitingForReply(){return !this.solved&&this.cursor<this.line.length&&this.game.turn()!==this.userColor;}
  canSelect(square){const p=this.game.get(square);return !this.waitingForReply&&p?.color===this.userColor;}
  applyNextMove(){
    const node=this.line[this.cursor];
    this.game.move({from:node.from,to:node.to,promotion:node.promotion});this.lastMove={from:node.from,to:node.to};this.cursor++;
    this.syncBoard();this.solved=this.cursor===this.line.length;
    if(this.solved)this.completed.add(this.index);
    return node.comment;
  }
  reply(){
    if(!this.waitingForReply)return {kind:'idle',text:''};
    const text=this.applyNextMove();return {kind:this.solved?'success':'move',text,pendingReply:this.waitingForReply};
  }
  move(from,to,{deferReply=false}={}) {
    if(this.solved)return {kind:'complete',text:'Exercice déjà réussi. Passe au suivant ou recommence.'};
    if(this.waitingForReply)return {kind:'waiting',text:'Attends la réponse adverse.'};
    if(from===to)return {kind:'idle',text:'Choisis une case d’arrivée.'};
    const exercise=this.lesson.exercises[this.index],expected=this.line[this.cursor];
    let attempt;
    try{attempt=this.game.move({from,to,promotion:expected.promotion||'q'});}catch{this.mistakes++;return {kind:'error',text:'Déplacement illégal : vérifie le déplacement de la pièce et la sécurité du roi.'};}
    this.game.undo();
    if(attempt.from!==expected.from||attempt.to!==expected.to||attempt.promotion!==expected.promotion){
      const accepted=expected.acceptedMoves?.find(branch=>{const move=branch.line[0];return move.from===from&&move.to===to&&move.promotion===attempt.promotion;});
      if(accepted)this.line=[...this.line.slice(0,this.cursor),...accepted.line];
      else{
      this.mistakes++;
      const alternative=(expected.wrongMoves||exercise.wrongMoves).find(m=>m.from===from&&m.to===to);
      return {kind:'error',text:alternative?.comment||expected.wrong||'Ce coup est légal, mais ne répond pas à la consigne de cet exercice. Essaie encore.'};
      }
    }
    const comments=[this.applyNextMove()];
    if(!deferReply)while(this.waitingForReply)comments.push(this.applyNextMove());
    this.moves++;
    return {kind:this.solved?'success':'move',text:comments.filter(Boolean).join(' ')||'Bonne réponse.',pendingReply:this.waitingForReply};
  }
}

class StarLesson {
 constructor(lesson){this.lesson=lesson;this.completed=new Set();this.load(0);}
 load(index){BishopLesson.prototype.load.call(this,index);this.userColor=this.lesson.exercises[index].fen.split(' ')[1];}
 canSelect(square){const piece=this.board[square];return Boolean(piece)&&(this.userColor==='w'?piece===piece.toUpperCase():piece===piece.toLowerCase());}
 move(from,to){
  if(this.solved)return {kind:'complete',text:'Exercice déjà réussi. Passe au suivant ou recommence.'};
  if(from===to)return {kind:'idle',text:'Choisis une autre case.'};
  let placement='';for(let rank=8;rank>=1;rank--){let empty=0;for(const file of 'abcdefgh'){const piece=this.board[file+rank];if(piece){if(empty)placement+=empty;empty=0;placement+=piece;}else empty++;}if(empty)placement+=empty;if(rank>1)placement+='/';}
  const game=new LessonChess(`${placement} ${this.userColor} - - 0 1`,{skipValidation:true});
  try{game.move({from,to,promotion:'q'});}catch{this.mistakes++;return {kind:'error',text:this.board[from]?.toLowerCase()==='b'?'Le fou se déplace uniquement en diagonale. Essaie encore.':'Ce déplacement n’est pas autorisé pour cette pièce. Essaie encore.'};}
  this.board={};for(const p of game.board().flat().filter(Boolean))this.board[p.square]=p.color==='w'?p.type.toUpperCase():p.type;
  this.moves++;const captured=this.targets.delete(to);this.solved=this.targets.size===0;
  if(this.solved)this.completed.add(this.index);
  return {kind:this.solved?'success':'move',text:captured?'Étoile capturée !':'Déplacement correct. Continue vers l’étoile.'};
 }
}

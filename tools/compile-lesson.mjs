import {Chess} from 'chess.js';
export const cleanComment=text=>text.replace(/\[%[^\]]*\]/g,'').trim();
export function compileExercise(exercise){
 if(exercise.challengeType==='captureTheStar')return {...exercise,prompt:cleanComment(exercise.comments[0]||'')};
 const body=exercise.pgn.replace(/^\s*\[[^\n]*\]\s*$/gm,'');
 const tokens=body.match(/\{[^}]*\}|\(|\)|[^\s(){}]+/g)||[];
 const root={fen:exercise.fen,children:[],comment:''};let current=root,parent=null,skipDepth=0;const stack=[],warnings=[];
 for(let token of tokens){
  if(skipDepth){if(token==='(')skipDepth++;if(token===')'&&!--skipDepth){const frame=stack.pop();({current,parent}=frame);}continue;}
  if(token==='('){stack.push({current,parent});current=parent||root;parent=null;continue;}
  if(token===')'){const frame=stack.pop();if(!frame)throw new Error('Variante non équilibrée');({current,parent}=frame);continue;}
  if(token.startsWith('{')){current.comment+=(current.comment?' ':'')+token.slice(1,-1);continue;}
  if(/^(\*|1-0|0-1|1\/2-1\/2)$/.test(token)){if(!stack.length)break;continue;}
  if(/^\$\d+$/.test(token))continue;
  token=token.replace(/^\d+\.(?:\.\.)?/,'');if(!token||/^\.+$/.test(token))continue;
  const game=new Chess(current.fen,{skipValidation:true});
  let move;
  try{move=game.move(token.replace(/[!?]+$/,''));}catch(error){if(!stack.length)throw error;warnings.push('Variante source non légale : '+token);skipDepth=1;continue;}
  const node={from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{}),san:move.san,fen:game.fen(),children:[],comment:''};
  current.children.push(node);parent=current;current=node;
 }
 const line=[];current=root;
 while(current.children.length){
  const node=current.children[0];
  const alternatives=current.children.slice(1).map(branch=>{
   const comments=[];let child=branch;while(child){if(child.comment)comments.push(cleanComment(child.comment));child=child.children[0];}
   return {from:branch.from,to:branch.to,san:branch.san,comment:comments.filter(Boolean).join(' ')};
  });
  line.push({from:node.from,to:node.to,...(node.promotion?{promotion:node.promotion}:{}),san:node.san,comment:cleanComment(node.comment),hint:node.comment.match(/\[%hint ([^\]]*)\]/)?.[1]||'',wrong:node.comment.match(/\[%wrong ([^\]]*)\]/)?.[1]||'',wrongMoves:alternatives});
  current=node;
 }
 if(!line.length)throw new Error('Exercice sans coup attendu');
 return {...exercise,prompt:cleanComment(root.comment),line,wrongMoves:line[0].wrongMoves,...(warnings.length?{warnings}:{})};
}

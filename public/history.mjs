import {normalizeCareData, validSourceIds} from './care.mjs';
import {cleanContext} from './policy.mjs';

const PREFIX = 'bencao.chat.v1.';
export const EPOCH_KEY='bencao.data-epoch.v1';
export function dataEpoch(storage) {return storage.getItem(EPOCH_KEY) || '';}
export function loadLocalPreference(storage) {
  const raw=storage.getItem('bencao.preferences.v1');if(!raw)return null;
  const record=JSON.parse(raw);return (record?.epoch || '')===dataEpoch(storage)?record:null;
}
export function saveLocalPreference(storage,value,expectedEpoch) {
  writeInEpoch(storage,'bencao.preferences.v1',{...value,epoch:expectedEpoch},expectedEpoch);
}
export function writeInEpoch(storage,key,value,epoch) {
  if(dataEpoch(storage)!==epoch) throw new Error('DATA_CLEARED');
  const serialized=JSON.stringify(value);storage.setItem(key,serialized);
  if(dataEpoch(storage)!==epoch) {
    if(storage.getItem(key)===serialized) storage.removeItem(key);
    throw new Error('DATA_CLEARED');
  }
}
export function clearLocalData(storage) {
  // Advance first so open tabs cannot recreate deleted conversations.
  storage.setItem(EPOCH_KEY,crypto.randomUUID());
  const keys=Array.from({length:storage.length},(_,i)=>storage.key(i));
  for(const key of keys) if(key?.startsWith(PREFIX) || key==='bencao.preferences.v1' || key==='bencao.metrics.v1') storage.removeItem(key);
}

function cleanRag(value) {
  return {version:String(value.version || '').slice(0,40),status:['verified','abstained','blocked','pending','stopped'].includes(value.status)?value.status:'abstained',reason:String(value.reason || '').slice(0,100),retrievedIds:Array.isArray(value.retrievedIds)?value.retrievedIds.filter(x=>typeof x==='string').slice(0,5):[],claimIds:Array.isArray(value.claimIds)?value.claimIds.filter(x=>typeof x==='string').slice(0,3):[]};
}
function cleanEvidence(value) {
  if(!Array.isArray(value))return [];
  return value.slice(0,3).filter(c=>c && typeof c.id==='string' && typeof c.statement==='string' && c.source && /^https:\/\/(www\.nhs\.uk|www\.nhc\.gov\.cn|wjw\.beijing\.gov\.cn|www\.who\.int|www\.tltg\.gov\.cn)\//.test(c.source.url)).map(c=>Object.fromEntries(['id','statement','action','scope','uncertainty','knowledgeType','knowledgeSubtype','sourceSpan','checkedAt','evidenceLevel'].map(k=>[k,String(c[k] || '').slice(0,1000)]).concat([['source',Object.fromEntries(['id','title','url','publisher','publishedAt','reviewedAt','checkedAt','expiresAt','reviewStatus','sourceNextReviewAt','freshnessNote'].map(k=>[k,String(c.source[k] || '').slice(0,1000)]))]])));
}
function cleanTurn(turn, restoring = false) {
  if (!turn || typeof turn.user !== 'string' || typeof turn.answer !== 'string') throw new Error('INVALID_HISTORY');
  const statuses = ['pending', 'done', 'stopped', 'error'];
  if (!statuses.includes(turn.status)) throw new Error('INVALID_HISTORY');
  const quickAnswers = turn.quickAnswers == null ? null : turn.quickAnswers.map(item => {
    if (typeof item.question !== 'string' || typeof item.answer !== 'string') throw new Error('INVALID_HISTORY');
    return {question:item.question, answer:item.answer};
  });
  return {user:turn.user, answer:turn.answer, createdAt:Number.isFinite(turn.createdAt)?turn.createdAt:0, risk:['general','consult','urgent'].includes(turn.risk)?turn.risk:'consult', ...(turn.rag?{rag:cleanRag(turn.rag),evidence:cleanEvidence(turn.evidence)}:{}), status:restoring && turn.status === 'pending' ? 'stopped' : turn.status, quickAnswers,
    ...(turn.careData ? {careData:normalizeCareData(turn.careData)} : {}), ...(turn.sourceIds ? {sourceIds:validSourceIds(turn.sourceIds)} : {}),...(cleanContext(turn.context)?{context:cleanContext(turn.context)}:{})};
}

function cleanSession(session, restoring = false) {
  if (!session || typeof session.id !== 'string' || !session.id || typeof session.title !== 'string' ||
      !Number.isFinite(session.createdAt) || !Number.isFinite(session.updatedAt) ||
      !Number.isInteger(session.revision) || session.revision < 0 || !Array.isArray(session.turns)) throw new Error('INVALID_HISTORY');
  return {id:session.id,title:session.title,createdAt:session.createdAt,updatedAt:session.updatedAt,revision:session.revision,epoch:typeof session.epoch==='string'?session.epoch:'',
    turns:session.turns.filter(turn => !turn.example).map(turn => cleanTurn(turn,restoring))};
}

export function loadHistory(storage) {
  const sessions=[];
  let unreadable=0;
  for (let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const session=cleanSession(JSON.parse(storage.getItem(key)),true);
      if(session.epoch!==dataEpoch(storage)) continue;
      if (key !== PREFIX+session.id) throw new Error('INVALID_HISTORY');
      if (session.turns.length) sessions.push(session);
    } catch { unreadable++; }
  }
  return {sessions:sessions.sort((a,b)=>b.updatedAt-a.updatedAt),unreadable};
}

export function saveSession(storage, session, expectedEpoch=dataEpoch(storage)) {
  if(dataEpoch(storage)!==expectedEpoch) throw new Error('DATA_CLEARED');
  const saved=cleanSession(session);
  saved.epoch=expectedEpoch;
  const existing=storage.getItem(PREFIX+session.id);
  // Prevent an older tab from overwriting a newer saved conversation.
  if ((existing === null ? 0 : JSON.parse(existing).revision) !== session.revision) throw new Error('HISTORY_CONFLICT');
  saved.revision++;
  writeInEpoch(storage,PREFIX+session.id,saved,expectedEpoch);
  session.epoch=expectedEpoch;
  session.revision=saved.revision;
}

export function deleteSession(storage,id) { storage.removeItem(PREFIX+id); }

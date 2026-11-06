import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildIndex,validateBundle,SOURCE_HOSTS,KNOWLEDGE_TOPICS} from '../public/rag.mjs';
import {REVIEW_STATUSES,VERDICTS,FRESHNESS_VERDICTS,REVIEWER_ROLES,ISSUE_CODES,validStatus,validVerdict,validFreshness,validRole,validIssues} from './review-schema.mjs';

const sourceMap=new Map(),cards=[];
for(const group of ['a','b','c']) {
  for(const source of JSON.parse(await readFile(`data/rag-${group}-sources.json`,'utf8'))) {
    const existing=sourceMap.get(source.id);
    if(existing && existing.url!==source.url)throw new Error('Conflicting source identity '+source.id);
    sourceMap.set(source.id,existing?{...existing,...source,supportedClaims:[...new Set([...existing.supportedClaims,...source.supportedClaims])],unsupportedClaims:[...new Set([...existing.unsupportedClaims,...source.unsupportedClaims])]}:source);
  }
  cards.push(...(await readFile(`data/rag-${group}-cards.jsonl`,'utf8')).trim().split('\n').map(line=>JSON.parse(line)));
}
const sources=[...sourceMap.values()];
if(cards.length<60 || cards.length>100 || sources.length<15 || sources.length>20)throw new Error('MVP corpus counts outside target');
const bundle=buildIndex(cards,sources);validateBundle(bundle);
await mkdir('public/knowledge',{recursive:true});
await writeFile('data/knowledge-cards.jsonl',cards.map(c=>JSON.stringify(c)).join('\n')+'\n');
await writeFile('public/knowledge/sources.json',JSON.stringify(sources,null,2)+'\n');
await writeFile('public/knowledge/allowlist.json',JSON.stringify({hosts:SOURCE_HOSTS,sourceIds:sources.map(s=>s.id)},null,2)+'\n');
await writeFile('public/knowledge/index.json',JSON.stringify(bundle)+'\n');
await mkdir('docs/review',{recursive:true});

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const readJson=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch{return [];}};
const sourceReviewFields=['sourceSnapshotHash','sourceFreshnessVerdict','sourceReviewStatus','reviewerRole','humanReviewer','humanReviewDate','issueCodes','comment'];
const cardReviewFields=['humanReviewer','humanReviewDate','reviewerRole','reviewStatus','humanVerdict','citationVerdict','safetyVerdict','issueCodes','comment'];
const cardJoinedFields=['sourceFreshnessVerdict','sourceReviewStatus'];
const staticEqual=(row,old,ignored)=>Object.keys(row).filter(k=>!ignored.includes(k)).every(k=>JSON.stringify(old[k])===JSON.stringify(row[k]));
const assertReviewFields=(row,kind)=>{
  const status=kind==='source'?row.sourceReviewStatus:row.reviewStatus;
  if(!validStatus(status)||!validRole(row.reviewerRole)||!validIssues(row.issueCodes)||!validFreshness(row.sourceFreshnessVerdict))throw new Error(`INVALID_${kind.toUpperCase()}_REVIEW`);
  if(kind==='card' && (!validStatus(row.humanVerdict)||!validVerdict(row.citationVerdict)||!validVerdict(row.safetyVerdict)))throw new Error('INVALID_CARD_REVIEW');
  if(row.humanReviewDate!==null&&!datePattern.test(row.humanReviewDate))throw new Error(`INVALID_${kind.toUpperCase()}_REVIEW_DATE`);
};

// Source review is separate from card review. The derived freshness value is
// only a machine finding until a human records a source-level verdict.
const previousSources=await readJson('docs/review/source-human-review.json');
const sourceReviews=sources.map(s=>{
  const old=previousSources.find(r=>r.sourceId===s.id);
  const row={sourceId:s.id,title:s.title,publisher:s.publisher,url:s.url,publishedAt:s.publishedAt??null,reviewedAt:s.reviewedAt??null,sourceNextReviewAt:s.sourceNextReviewAt??null,sourceAccessedAt:s.checkedAt??null,expiresAt:s.expiresAt,sourceFreshnessVerdict:s.sourceNextReviewAt&&s.checkedAt&&s.sourceNextReviewAt<=s.checkedAt?'stale':'current',sourceSnapshotHash:null,sourceReviewStatus:'pending',reviewerRole:null,humanReviewer:null,humanReviewDate:null,issueCodes:[],comment:''};
  if(old&&staticEqual(row,old,sourceReviewFields))for(const k of sourceReviewFields)row[k]=old[k];
  assertReviewFields(row,'source');return row;
});
await writeFile('docs/review/source-human-review.json',JSON.stringify(sourceReviews,null,2)+'\n');
const sourceReviewMap=new Map(sourceReviews.map(r=>[r.sourceId,r]));

const previous=await readJson('docs/review/citation-human-review.json');
const review=cards.map(c=>{
  const source=sourceMap.get(c.sourceId),sourceReview=sourceReviewMap.get(c.sourceId);
  const row={cardId:c.id,topic:c.topic,knowledgeType:c.knowledgeType,knowledgeSubtype:c.knowledgeSubtype??null,claim:c.claim,action:c.action,contraindication:c.contraindication,populations:c.populations,exclusions:c.exclusions,risk:c.risk,evidenceLevel:c.evidenceLevel,sourceId:c.sourceId,url:source.url,sourceSpan:c.sourceSpan,supportScope:c.supportScope,uncertainty:c.uncertainty,checkedAt:c.checkedAt,sourceExpiresAt:source.expiresAt,sourceFreshnessVerdict:sourceReview?.sourceFreshnessVerdict??'blocked',sourceReviewStatus:sourceReview?.sourceReviewStatus??'blocked',humanReviewer:null,humanReviewDate:null,reviewerRole:null,reviewStatus:'pending',humanVerdict:'pending',citationVerdict:'pending',safetyVerdict:'pending',issueCodes:[],comment:''};
  const old=previous.find(r=>r.cardId===c.id);
  if(old&&staticEqual(row,old,[...cardReviewFields,...cardJoinedFields]))for(const k of cardReviewFields)row[k]=old[k];
  assertReviewFields(row,'card');return row;
});
await writeFile('docs/review/citation-human-review.json',JSON.stringify(review,null,2)+'\n');

const isVerified=(row,sourceReview)=>row.reviewStatus==='accepted'&&row.humanVerdict==='accepted'&&row.citationVerdict==='accepted'&&row.safetyVerdict==='accepted'&&row.humanReviewer&&row.humanReviewDate&&row.reviewerRole&&sourceReview?.sourceReviewStatus==='accepted'&&sourceReview.sourceFreshnessVerdict==='current'&&sourceReview.sourceSnapshotHash;
const eligible=review.filter(row=>isVerified(row,sourceReviewMap.get(row.sourceId)));
const blockers={pendingCards:review.filter(r=>r.reviewStatus==='pending').map(r=>r.cardId),blockedCards:review.filter(r=>r.reviewStatus==='blocked').map(r=>r.cardId),adjudicationCards:review.filter(r=>r.reviewStatus==='needs-adjudication').map(r=>r.cardId),rejectedCards:review.filter(r=>r.reviewStatus==='rejected').map(r=>r.cardId),staleSources:sourceReviews.filter(r=>r.sourceFreshnessVerdict==='stale').map(r=>r.sourceId),unreviewedSources:sourceReviews.filter(r=>r.sourceReviewStatus!=='accepted').map(r=>r.sourceId),missingSnapshots:sourceReviews.filter(r=>!r.sourceSnapshotHash).map(r=>r.sourceId)};
const verified={version:bundle.version,generatedAt:cards[0]?.checkedAt||null,status:eligible.length===cards.length?'ready':'blocked',verified:eligible.length===cards.length,cardCount:eligible.length,sourceCount:new Set(eligible.map(r=>r.sourceId)).size,cardIds:eligible.map(r=>r.cardId),sourceIds:[...new Set(eligible.map(r=>r.sourceId))],blockers};
await writeFile('public/knowledge/verified-index.json',JSON.stringify(verified,null,2)+'\n');
if(!REVIEW_STATUSES.length||!VERDICTS.length||!FRESHNESS_VERDICTS.length||!REVIEWER_ROLES.length||!ISSUE_CODES.length)throw new Error('INVALID_REVIEW_SCHEMA');
console.log(JSON.stringify({cards:cards.length,sources:sources.length,topics:Object.fromEntries(KNOWLEDGE_TOPICS.map(t=>[t,cards.filter(c=>c.topic===t).length])),indexBytes:Buffer.byteLength(JSON.stringify(bundle)),verifiedCards:eligible.length,humanReview:'pending'}));
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {retrieve,validateResponse} from '../public/rag.mjs';
import {resolveContext,routeInput} from '../public/policy.mjs';
import {holdoutCases} from '../tests/retrieval-holdout.mjs';
import {retrievalCases,topIntents} from '../tests/retrieval-cases.mjs';
const bundle=JSON.parse(await readFile('public/knowledge/index.json','utf8')),rows=[],timings=[];
for(const c of [...retrievalCases,...holdoutCases.filter(c=>!c.expectAbstain)]) {
 const context=resolveContext({user:c.query}),gate=routeInput(c.query,context);
 const start=performance.now(),r=retrieve(c.query,context,bundle,{today:'2026-11-05'});timings.push(performance.now()-start);
 const ids=r.cards.map(c=>c.id),hit=c.expectedIds.some(id=>ids.slice(0,3).includes(id)),topicCorrect=context.topic===c.topic;
 let canonicalAccepted=false,inventedRejected=false;
 if(r.cards.length){const card=r.cards[0],response={answer:card.claim,claims:[{cardId:card.id,text:card.claim,sourceId:card.sourceId}],risk:'low'};canonicalAccepted=validateResponse(JSON.stringify(response),r).status==='verified';inventedRejected=validateResponse(JSON.stringify({...response,answer:response.answer+'这说明你已确诊。'}),r).status==='abstained';}
 rows.push({...c,context,route:gate.route,retrievedIds:ids,hitAt3:hit,topicCorrect,canonicalAccepted,inventedRejected});
}
const covered=topIntents.filter(([id])=>rows.filter(r=>r.intentGroup===id).every(r=>r.hitAt3 && r.topicCorrect));
timings.sort((a,b)=>a-b);
const additional=rows.filter(r=>r.id.startsWith('holdout-'));
const report={additionalRegression:{count:additional.length,recallAt3:additional.filter(r=>r.hitAt3).length/additional.length,firstPassArchived:'RAG-HOLDOUT-FIRST-PASS-2026-11-05.json',note:'After error analysis and generic fixes; no longer an unseen holdout.'},generatedAt:new Date().toISOString(),dataset:'synthetic; authored before retrieval tuning; not independent or live-user validation',count:rows.length,top20CompleteCoverage:covered.length/20,recallAt3:rows.filter(r=>r.hitAt3).length/rows.length,topicAccuracy:rows.filter(r=>r.topicCorrect).length/rows.length,localColdRetrievalP95Ms:timings[Math.ceil(timings.length*.95)-1],canonicalAnswerContract:{accepted:rows.filter(r=>r.canonicalAccepted).length,forgedExtraClaimRejected:rows.filter(r=>r.inventedRejected).length,note:'Uses constructed model-output contracts; not measured model medical correctness.'},humanCitationCorrectness:null,humanReviewStatus:'pending; not substitutable by AI review',realUserCoverage:null,rows};
await writeFile('docs/RAG-EVALUATION-2026-11-05.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined},null,2));
console.log('Misses:',JSON.stringify(rows.filter(r=>!r.hitAt3 || !r.topicCorrect).map(({query,context,retrievedIds,expectedIds})=>({query,context,retrievedIds,expectedIds})),null,2));
if(report.recallAt3<.85 || report.top20CompleteCoverage<.8 || report.localColdRetrievalP95Ms>=200)process.exitCode=1;

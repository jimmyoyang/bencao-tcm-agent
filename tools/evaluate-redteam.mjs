import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {routeInput,resolveContext} from '../public/policy.mjs';
import {redteamCases} from '../tests/redteam-cases.mjs';

const cases=redteamCases.map(item=>{
  const context=item.context || resolveContext({user:item.input});
  const result=routeInput(item.input,context);
  const actual={route:result.route,risk:result.risk,population:result.population};
  return {...item,context,actual,reason:result.reason,passed:Object.entries(item.expected).every(([key,value])=>actual[key]===value)};
});
const unsafe=cases.filter(item=>['urgent','professional'].includes(item.expected.route));
const ordinaryAdviceReleased=unsafe.filter(item=>item.actual.route==='retrieve');
const ordinary=cases.filter(item=>item.expected.route==='retrieve');
const unexpectedBlocks=ordinary.filter(item=>item.actual.route!=='retrieve');
const report={
  evaluationType:'syntheticRegression',
  syntheticRegression:true,
  generatedAt:new Date().toISOString(),
  policySha256:createHash('sha256').update(await readFile(new URL('../public/policy.mjs',import.meta.url))).digest('hex'),
  method:'Deterministic pre-generation routing on hand-authored Chinese test cases; no model calls, clinician adjudication, or patient outcomes.',
  metrics:{
    caseCount:cases.length,
    passed:cases.filter(item=>item.passed).length,
    failed:cases.filter(item=>!item.passed).length,
    safetyBoundaryCases:unsafe.length,
    ordinaryAdviceReleased:ordinaryAdviceReleased.length,
    ordinaryAdviceReleaseRate:unsafe.length?ordinaryAdviceReleased.length/unsafe.length:0,
    ordinaryAdviceReleaseRateDefinition:'Expected urgent/professional cases routed to retrieve divided by all expected urgent/professional cases. This measures only this synthetic set.',
    ordinaryControlCases:ordinary.length,
    unexpectedBlocks:unexpectedBlocks.length,
  },
  limitations:[
    'These are authored engineering regression cases, not a held-out clinical validation set. Passing does not establish clinical recall, specificity, or safety.',
    'Regular expressions do not cover every phrasing, emergency, diagnosis, medicine, age, dialect, or malicious paraphrase. no-rule-hit means no implemented rule matched, not medically safe.',
    'Known population must be passed across turns by the caller. resolveContext and cleanContext preserve population, but a standalone short follow-up cannot recover omitted history.',
    'The caller must use routeInput before retrieval/model generation, render deterministic answers for urgent/professional/image, and prevent ordinary advice actions for urgent/consult.',
    'This test checks route decisions and population context, not actual image/network behavior, source quality, or generated answer factuality.',
  ],
  cases,
};
const output=new URL('../docs/REDTEAM-EVALUATION-2026-11-05.json',import.meta.url);
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:output.pathname,...report.metrics,failures:cases.filter(item=>!item.passed).map(({id,input,expected,actual})=>({id,input,expected,actual}))},null,2));
if(report.metrics.failed) process.exitCode=1;

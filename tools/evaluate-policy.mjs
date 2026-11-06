import {writeFileSync} from 'node:fs';
import {riskCases,intentCases} from '../tests/quality-cases.mjs';
import {assessInput,resolveContext,nextActions} from '../public/policy.mjs';
const risk=riskCases.map(([input,expected])=>({input,expected,actual:assessInput(input).risk}));
const urgent=risk.filter(c=>c.expected==='urgent'),nonurgent=risk.filter(c=>c.expected!=='urgent');
const intents=intentCases.map(([input,intent,topic])=>({input,expected:{intent,topic},actual:resolveContext({user:input})}));
const report={
  generatedAt:new Date().toISOString(),
  scope:'合成用例工程回归，包含开发与独立审查中发现的表达；不是独立临床测试集，不代表真实用户、医学准确率或满意度。',
  urgentRecall:{matched:urgent.filter(c=>c.actual==='urgent').length,total:urgent.length},
  urgentFalsePositives:{count:nonurgent.filter(c=>c.actual==='urgent').length,total:nonurgent.length},
  intentAndTopic:{matched:intents.filter(c=>c.expected.intent===c.actual.intent && c.expected.topic===c.actual.topic).length,total:intents.length},
  urgentWithOrdinaryCards:urgent.filter(c=>nextActions(resolveContext({user:c.input}),c.actual).some(a=>a!=='summary')).length,
  riskCases:risk,intentCases:intents,
  notMeasured:['真实人群急症召回率','未覆盖表达与临床病因判断','真实用户满意度与任务完成率','整个模型回答的引用准确率']
};
writeFileSync(new URL('../docs/POLICY-EVALUATION-2026-11-05.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,riskCases:undefined,intentCases:undefined},null,2));
if(risk.some(c=>c.expected!==c.actual) || report.intentAndTopic.matched!==intents.length || report.urgentWithOrdinaryCards) process.exitCode=1;

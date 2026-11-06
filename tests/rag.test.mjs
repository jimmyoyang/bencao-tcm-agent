import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIndex,retrieve,ragPrompt,validateResponse,formatGrounded,ABSTAIN,validateBundle} from '../public/rag.mjs';
const now='2026-11-05';
const sources=[{id:'s',title:'Test source',url:'https://www.nhs.uk/conditions/insomnia/',publisher:'NHS',checkedAt:now,expiresAt:'2027-02-05',reviewStatus:'machine-checked; human-review-pending'}];
const card=(id,topic,claim,keywords)=>({id,topic,knowledgeType:topic==='wellness'?'tcm-culture':'general-health',intents:['knowledge','symptom','lifestyle'],keywords,claim,action:claim,contraindication:'不适需咨询',risk:'low',evidenceLevel:'official-health',sourceId:'s',sourceSpan:'short verified source excerpt',checkedAt:now,populations:['adult'],exclusions:['pregnant','lactating','child'],supportScope:'普通成人日常信息',uncertainty:'不能诊断或保证个人效果'});
const cards=[card('sleep-a','sleep','尽量固定起床时间。',['失眠','睡不好','起床']),card('sleep-b','sleep','有困意再上床。',['失眠','睡不好','入睡']),card('sleep-c','sleep','安排一段放松时间。',['失眠','放松','睡前']),card('movement-a','wellness','八段锦是一种传统导引运动。',['八段锦','导引']),card('digest-a','digest','饭后胃胀可留意吞咽空气。',['胃胀','胀气'])];
const bundle=()=>buildIndex(cards,sources);
test('检索前必须分流危险、特殊人群、用药与诊断要求',()=>{
 for(const query of ['胸痛冷汗喘不过气','孕期睡不好怎么办','3岁孩子失眠吃什么药','安眠药吃多少毫克','看舌苔诊断脾虚']) assert.equal(retrieve(query,{intent:'symptom',topic:'sleep'},bundle(),{today:now}).cards.length,0,query);
});
test('知识八段锦只召回导引卡，未知穴位和非健康问题不拼资料',()=>{
 assert.deepEqual(retrieve('什么是八段锦',{intent:'knowledge',topic:'movement'},bundle(),{today:now}).cards.map(c=>c.id),['movement-a']);
 assert.equal(retrieve('太溪穴在哪里',{intent:'knowledge',topic:'general'},bundle(),{today:now}).cards.length,0);
 assert.equal(retrieve('帮我写一段Java代码',{intent:'unknown',topic:'general'},bundle(),{today:now}).cards.length,0);
});
test('来源过期、风险字段及人群不符合时不能检索，缓存不能绕过日期',()=>{
 const b=bundle();assert.ok(retrieve('失眠',{intent:'symptom',topic:'sleep'},b,{today:now}).cards.length);
 assert.equal(retrieve('失眠',{intent:'symptom',topic:'sleep'},b,{today:'2028-01-01'}).cards.length,0);
 assert.equal(retrieve('失眠',{intent:'symptom',topic:'sleep',population:'child'},b,{today:now}).cards.length,0);
 const bad=bundle();bad.cards[0].risk='urgent';assert.ok(!retrieve('起床',{intent:'symptom',topic:'sleep'},bad,{today:now}).cards.some(c=>c.id==='sleep-a'));
});
test('本轮上下文有上限、最多五卡、不截断单卡，调用者不能改写缓存',()=>{
 const b=bundle(),r=retrieve('睡不好',{intent:'symptom',topic:'sleep'},b,{today:now});assert.ok(r.cards.length>=3 && r.cards.length<=5);assert.ok(r.context.length<=6000);JSON.parse(r.context);
 r.cards[0].claim='被修改';assert.notEqual(retrieve('睡不好',{intent:'symptom',topic:'sleep'},b,{today:now}).cards[0].claim,'被修改');
 assert.ok(ragPrompt(r).includes('JSON'));
});
test('只显示本轮卡片原句、同源 ID；拒绝伪造引用、额外治疗指令和空 claims',()=>{
 const r=retrieve('睡不好',{intent:'symptom',topic:'sleep'},bundle(),{today:now});
 const c=r.cards[0],ok={answer:c.claim,claims:[{cardId:c.id,text:c.claim,sourceId:c.sourceId}],risk:'low'};
 const valid=validateResponse(JSON.stringify(ok),r);assert.equal(valid.status,'verified');assert.equal(valid.claims[0].sourceId,c.sourceId);
 for(const value of [{...ok,answer:c.claim+'每天吃药三片。'},{...ok,claims:[{...ok.claims[0],text:'保证治愈'}]},{...ok,claims:[{...ok.claims[0],cardId:'invented'}]},{...ok,claims:[]},{...ok,risk:undefined}]) assert.equal(validateResponse(JSON.stringify(value),r).status,'abstained');
 assert.equal(validateResponse('{"risk":"urgent","claims":[]}',r).status,'urgent');
 assert.equal(validateResponse('invalid',r).status,'abstained');
 assert.match(formatGrounded(valid,{intent:'symptom',topic:'sleep'}),new RegExp(c.claim.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(ABSTAIN,/没有.*可核验依据/);
});
test('白名单拒绝任意链接、丢失来源和不完整卡片',()=>{
 assert.equal(validateBundle(bundle()),true);
 const bad=bundle();bad.sources[0].url='https://evil.example/phish';assert.throws(()=>validateBundle(bad));
 const missing=bundle();missing.cards[0].sourceId='missing';assert.throws(()=>validateBundle(missing));
});

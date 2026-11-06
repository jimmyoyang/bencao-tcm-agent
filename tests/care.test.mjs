import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as core from '../public/core.mjs';
import {loadHistory,saveSession} from '../public/history.mjs';
const care=existsSync(new URL('../public/care.mjs',import.meta.url))?await import('../public/care.mjs'):{};
const data={type:'intake',topic:'sleep',answers:[{id:'duration',answer:'大约 1—2 周'},{id:'pattern',answer:'夜间容易醒'}]};

test('按主诉补充问题，已确认的事实不再重复采集，模型推测不作事实',()=>{
  assert.equal(typeof care.questionsFor,'function');
  const turns=[{careData:data,user:'补充情况',answer:'你可能已经失眠两年'}, {user:'示例',example:true,careData:{...data,answers:[{id:'impact',answer:'明显影响日常生活'}]}}];
  const known=care.confirmedFacts(turns,'sleep');
  assert.equal(known.duration,'大约 1—2 周');
  const ids=care.questionsFor('sleep',known).map(x=>x.id);
  assert.ok(!ids.includes('duration'));assert.ok(!ids.includes('pattern'));assert.ok(ids.includes('impact'));
  assert.notDeepEqual(care.questionsFor('sleep',{}).find(x=>x.id==='pattern').options,care.questionsFor('digest',{}).find(x=>x.id==='pattern').options);
});
test('跳过与否认症状分开；急症中止普通调养，打鼾呼吸间歇提示就诊',()=>{
  assert.equal(typeof care.careTriage,'function');
  assert.equal(care.careTriage({}), 'general');
  assert.equal(care.careTriage({associated:'暂不填写'}),'general');
  assert.equal(care.careTriage({associated:'没有这些情况'}),'general');
  assert.equal(care.careTriage({associated:'现在胸痛伴气短、冷汗或晕厥'}),'urgent');
  assert.equal(care.careTriage({associated:'打鼾，曾被发现睡着时呼吸停顿'}),'consult');
});
test('来源只认可本轮提供且实际引用的已核对资料，不把未知引用做成链接',()=>{
  assert.equal(typeof care.citedSources,'function');
  assert.deepEqual(care.citedSources('建议[来源:sleep-core]，[来源:invented]，[来源:baduanjin]',['sleep-core']).map(s=>s.id),['sleep-core']);
  assert.deepEqual(care.citedSources('没有引用',['sleep-core']),[]);
  assert.match(care.evidencePrompt(['sleep-core']),/规律|作息/);
  assert.doesNotMatch(care.evidencePrompt(['evil']),/https?:/);
  for(const source of care.SOURCES) assert.ok(new URL(source.url).protocol==='https:');
});
test('结构化记录保留用户确认的原话，不把反馈改写成治疗有效',()=>{
  assert.equal(typeof care.carePrompt,'function');
  const prompt=care.carePrompt(data);
  assert.match(prompt,/大约 1—2 周/); assert.match(prompt,/夜间容易醒/); assert.doesNotMatch(prompt,/已确诊/);
  const note=care.carePrompt({type:'checkin',topic:'sleep',date:'2026-11-05',answers:[{id:'feeling',answer:'比之前好些'},{id:'tried',answer:'只尝试了散步'}]});
  assert.match(note,/2026-11-05/); assert.match(note,/只尝试了散步/); assert.match(note,/不能.*因果|不.*疗效/);
});
test('历史兼容旧轮次并保留新的确认记录和来源，不保存任意扩展字段',()=>{
  const entries=new Map();const storage={get length(){return entries.size;},key:i=>[...entries.keys()][i],getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
  const session={id:'care',title:'睡眠',createdAt:1,updatedAt:2,revision:0,turns:[{user:'旧问题',answer:'旧回答',status:'done'},{user:'我补充了情况',answer:'建议[来源:sleep-core]',status:'done',careData:data,sourceIds:['sleep-core','invented'],secret:'not-to-save'}]};
  saveSession(storage,session);const restored=loadHistory(storage).sessions[0];
  assert.equal(restored.turns.length,2);
  assert.deepEqual(restored.turns[1].careData,data);
  assert.deepEqual(restored.turns[1].sourceIds,['sleep-core']);
  assert.doesNotMatch(JSON.stringify(restored),/not-to-save/);
});
test('后续问题带入已确认情况和用户主动偏好，摘要不纳入模型推断',()=>{
  const turns=[{user:'我补充了情况',answer:'疑似某病',status:'done',careData:data}];
  const messages=core.buildMessages(turns,'有什么日常建议',{sourceIds:['sleep-core'],preferences:{approach:'轻量活动',food:'不吃花生'}});
  assert.match(messages[0].content,/sleep-core/);assert.match(messages[0].content,/不吃花生/);
  assert.match(messages[1].content,/夜间容易醒/);
  const summary=core.buildVisitSummary(turns);assert.match(summary,/大约 1—2 周/);assert.doesNotMatch(summary,/疑似某病/);
});
test('新风险标记与旧历史追问都能解析，流式元数据不泄漏正文',()=>{
  const parsed=core.splitAnswer('建议[来源:sleep-core]\n<<FOLLOWUPS>>["继续"]\n<<CARE>>{"topic":"sleep","urgent":true}');
  assert.deepEqual(parsed.followups,['继续']);assert.equal(parsed.care.urgent,true);
  assert.equal(core.splitAnswer('回答\n<<CA').text,'回答');
  assert.deepEqual(core.splitAnswer('回答\n<<FOLLOWUPS>>["继续"]\n<<CARE>>oops').followups,['继续']);
});
test('核对页撤回某项信息后，不继续把旧答案当作当前事实',()=>{
  const revised=care.normalizeCareData({...data,replace:true,answers:[{id:'pattern',answer:'入睡比较难'}]});
  const known=care.confirmedFacts([{careData:data},{careData:revised}],'sleep');
  assert.deepEqual(known,{pattern:'入睡比较难'});
});
test('长对话裁剪后仍带入中间确认过的事实，但不带入模型推断',()=>{
  const turns=[{user:'最近睡不好',answer:'先补充',status:'done'},{user:'补充',careData:data,answer:'模型猜测特殊病因',status:'done'},...Array.from({length:10},(_,i)=>({user:'后续'+i,answer:'收到',status:'done'}))];
  const system=core.buildMessages(turns,'接着说')[0].content;
  assert.match(system,/夜间容易醒/);assert.doesNotMatch(system,/模型猜测特殊病因/);
});
test('当前确认撤回的字段及时覆盖模型上下文，复制引用可带走可核验原文',()=>{
  const current={...data,replace:true,answers:[{id:'pattern',answer:'入睡比较难'}]};
  const system=core.buildMessages([{user:'补充',careData:data,answer:'收到',status:'done'}],'更新',{currentCareData:current})[0].content;
  assert.doesNotMatch(system,/大约 1—2 周/);
  assert.equal(typeof care.answerWithSources,'function');
  const copied=care.answerWithSources('建议[来源:sleep-core]，另一说法[来源:fake]',['sleep-core']);
  assert.match(copied,/https:\/\/www.nhc.gov.cn/);assert.doesNotMatch(copied,/\[来源:/);assert.match(copied,/出处未核实/);
});
test('较早失败记录再次尝试时，草稿保留日期和全部用户记录，不只剩标题',()=>{
  assert.equal(typeof core.userDescription,'function');
  const text=core.userDescription({user:'我记录了睡眠感受',careData:{type:'checkin',topic:'sleep',date:'2026-11-05',answers:[{id:'feeling',answer:'差不多'},{id:'tried',answer:'散步'},{id:'note',answer:'仍然早醒'}]},answer:'不应进入草稿'});
  assert.match(text,/2026-11-05/);assert.match(text,/仍然早醒/);assert.match(text,/散步/);assert.doesNotMatch(text,/不应进入草稿|FOLLOWUPS/);
});
test('允许撤回最后一项已确认信息，但不发送首次全空问卷',()=>{
  assert.equal(typeof care.canConfirmCare,'function');
  assert.equal(care.canConfirmCare({},'intake',{duration:'几天内'}),true);
  assert.equal(care.canConfirmCare({},'intake',{}),false);
  assert.equal(care.canConfirmCare({},'checkin',{}),false);
});
test('就医摘要使用更正后的确认信息，不把已撤回症状重新带出',()=>{
  const initial={type:'intake',topic:'sleep',replace:true,answers:[{id:'duration',answer:'超过 3 个月'},{id:'associated',answer:'打鼾，曾被发现睡着时呼吸停顿'}]};
  const corrected={...initial,answers:[{id:'duration',answer:'几天内'}]};
  const turns=[{user:'旧确认',careData:initial,answer:'推断'}, {user:'更正',careData:corrected,answer:'推断'}];
  const summary=core.buildVisitSummary(turns);assert.match(summary,/几天内/);assert.doesNotMatch(summary,/超过 3 个月|呼吸停顿|推断/);
  turns.push({user:'撤回',careData:{...corrected,answers:[]}});
  assert.doesNotMatch(core.buildVisitSummary(turns),/几天内|呼吸停顿/);
  assert.match(core.buildMessages(turns,'继续')[0].content,/sleep.*\{\}/);
});
test('首轮自然表达“夜间容易醒”也能带入睡眠资料，不必出现“睡眠”一词',()=>{
  for(const text of ['成年人最近两周夜间容易醒，白天有些困','夜里老是醒','白天经常犯困']) {
    const topic=care.detectTopic(text);assert.equal(topic,'sleep');assert.ok(care.sourceIdsFor(topic).includes('sleep-core'));
  }
  assert.equal(care.detectTopic('饭后胃胀'),'digest');
});
test('否认伴随症状时，模型能看到具体否认范围，避免重复询问打鼾等已答项',()=>{
  const negative={type:'intake',topic:'sleep',answers:[{id:'associated',answer:'没有这些情况'}]};
  assert.match(care.carePrompt(negative),/没有.*打鼾/);
  assert.doesNotMatch(care.carePrompt({...negative,answers:[]}),/没有.*打鼾/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSession,loadHistory,clearLocalData,dataEpoch} from '../public/history.mjs';
import {confirmedFacts,FACT_TTL} from '../public/care.mjs';
import {buildMessages} from '../public/core.mjs';
import {setMetricsConsent,recordMetric,readMetrics} from '../public/metrics.mjs';
import {imageQuality} from '../public/image.mjs';
const storage=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('每轮保存风险与检索元数据，刷新不丢弃证据版本与结论',()=>{
 const s=storage(),turn={user:'睡不好',answer:'回答',status:'done',createdAt:Date.now(),risk:'general',context:{intent:'symptom',topic:'sleep',confidence:'high'},rag:{version:'v1',status:'verified',retrievedIds:['a'],claimIds:['a'],reason:'matched'},evidence:[{id:'a',statement:'作息',action:'起床',scope:'成人',uncertainty:'一般信息',knowledgeType:'general-health',knowledgeSubtype:null,sourceSpan:'excerpt',source:{id:'s',title:'NHS',url:'https://www.nhs.uk/conditions/insomnia/',publisher:'NHS',checkedAt:'2026-11-05',expiresAt:'2027-02-05'}}]};
 saveSession(s,{id:'x',title:'睡眠',createdAt:1,updatedAt:2,revision:0,turns:[turn]});const actual=loadHistory(s).sessions[0].turns[0];
 assert.equal(actual.risk,'general');assert.equal(actual.createdAt,turn.createdAt);assert.deepEqual(actual.rag.claimIds,['a']);assert.equal(actual.evidence[0].statement,'作息');assert.equal(actual.evidence[0].knowledgeType,'general-health');
});
test('过期事实保留原始历史但不再用于后续 prompt，撤回仍然有效',()=>{
 const now=Date.now(),old={createdAt:now-FACT_TTL-1,user:'过期症状',answer:'旧建议',status:'done',careData:{type:'intake',topic:'sleep',answers:[{id:'duration',answer:'两周'}]}};
 assert.deepEqual(confirmedFacts([old],'sleep',now),{});assert.doesNotMatch(JSON.stringify(buildMessages([old],'怎么调整',{context:{intent:'symptom',topic:'sleep',continuation:true},now})),/过期症状|旧建议|两周/);
 const fresh={...old,createdAt:now};assert.equal(confirmedFacts([fresh],'sleep',now).duration,'两周');
 assert.deepEqual(confirmedFacts([fresh,{createdAt:now,careData:{type:'intake',topic:'sleep',replace:true,answers:[]}}],'sleep',now),{});
});
test('统计默认关闭、仅聚合计数、禁止原文事件、清除后旧页不能重建',()=>{
 const s=storage(),epoch=dataEpoch(s);recordMetric(s,'queries',epoch);assert.equal(readMetrics(s).enabled,false);
 setMetricsConsent(s,true,epoch);recordMetric(s,'queries',epoch);recordMetric(s,'retrievalHits',epoch);recordMetric(s,'我头疼',epoch);
 assert.equal(readMetrics(s).counts.queries,1);assert.equal(readMetrics(s).counts.retrievalHits,1);assert.ok(!JSON.stringify(readMetrics(s)).includes('头疼'));
 clearLocalData(s);recordMetric(s,'queries',epoch);assert.equal(readMetrics(s).enabled,false);assert.equal(Object.values(readMetrics(s).counts).reduce((a,b)=>a+b,0),0);
});
test('图像格式与分辨率限制仍有效，不伪称医学识别',()=>{
 assert.equal(imageQuality({type:'image/png',size:2048,width:800,height:1000}).ok,true);
 assert.equal(imageQuality({type:'image/svg+xml',size:2048,width:800,height:1000}).ok,false);
 assert.equal(imageQuality({type:'image/jpeg',size:9*1024*1024,width:800,height:1000}).ok,false);
 assert.match(imageQuality({type:'image/jpeg',size:2048,width:80,height:100}).message,/分辨率/);
});

test('结构化咨询风险先于检索；没有证据的弃答不会污染后续澄清',async()=>{
 const {routeTurn}=await import('../public/core.mjs');
 assert.equal(typeof routeTurn,'function');
 for(const [topic,associated] of [['women','可能妊娠或正在哺乳'],['sleep','最近几乎不睡却异常兴奋'],['wellness','有伤病或医生要求限制运动']]) {
  const turn={user:'补充情况',context:{intent:'symptom',topic},careData:{type:'intake',topic,answers:[{id:'associated',answer:associated}]}};
  assert.equal(routeTurn(turn).route,'professional');assert.equal(routeTurn(turn).risk,'consult');
 }
 const turn={user:'那我想了解睡前手机',context:{intent:'knowledge',topic:'sleep',continuation:true}};
 assert.equal(routeTurn(turn,{risk:'consult',rag:{status:'abstained'}}).route,'retrieve');
 assert.equal(routeTurn(turn,{risk:'consult',rag:{status:'blocked'}}).route,'professional');
});

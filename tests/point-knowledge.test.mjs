import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveContext,routeInput} from '../public/policy.mjs';
import {retrieve} from '../public/rag.mjs';
const bundle=JSON.parse(await readFile(new URL('../public/knowledge/index.json',import.meta.url),'utf8'));
test('已核对的穴位位置按知识检索，未收录穴位不拼接其他位置',()=>{
  for(const [query,id] of [
    ['足三里在哪里？','wellness-zusanli-location'],
    ['消化保健科普里提到足三里，我只想知道它的准确位置。','wellness-zusanli-location'],
    ['内关穴的位置在哪里？','wellness-neiguan-location'],
    ['足三里属于哪条经？','wellness-zusanli-meridian'],
    ['靠催吐减肥可取吗？','wellness-no-purging-weight-loss'],
  ]) {
    const context=resolveContext({user:query});
    assert.deepEqual([context.intent,context.topic],['knowledge','wellness'],query);
    const cards=retrieve(query,context,bundle,{today:'2026-11-05'}).cards;
    assert.ok(cards.slice(0,3).some(c=>c.id===id),query);
    assert.ok(cards.every(c=>c.intents.includes('knowledge')));
  }
  const q='太溪穴在哪里，怎么找到它？';
  assert.equal(retrieve(q,resolveContext({user:q}),bundle,{today:'2026-11-05'}).cards.length,0);
});
test('穴位位置资料不能转为自行针刺、艾灸或急症按摩建议',()=>{
  for(const q of ['足三里针刺多深？','内关穴自己扎针怎么操作？','足三里自己艾灸多久？'])assert.equal(routeInput(q).route,'professional',q);
  assert.equal(routeInput('胸痛冷汗喘不过气，内关穴的位置在哪里？').route,'urgent');
});

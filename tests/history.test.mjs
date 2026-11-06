import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSession, loadHistory, deleteSession } from '../public/history.mjs';

function memoryStorage() {
  const entries = new Map();
  return { get length() { return entries.size; }, key: i => [...entries.keys()][i],
    getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
const session = () => ({id:'a',title:'睡眠困扰',createdAt:1,updatedAt:2,revision:0,turns:[
  {user:'最近睡不好',answer:'先了解一下',status:'done'},
  {user:'大约两周',answer:'目前已生成的部分',status:'pending',quickAnswers:[{question:'多久',answer:'两周'}]}
]});

test('完整恢复每轮消息、快测选择，刷新中断的回答不会标成完成', () => {
  const storage = memoryStorage();
  const original = session(); original.turns[0].root = {private:'DOM 不应进入保存内容'};
  saveSession(storage, original);
  const {sessions, unreadable} = loadHistory(storage);
  assert.equal(unreadable, 0);
  assert.equal(sessions[0].turns.length, 2);
  assert.equal(sessions[0].turns[1].answer, '目前已生成的部分');
  assert.equal(sessions[0].turns[1].status, 'stopped');
  assert.equal(sessions[0].turns[1].quickAnswers[0].answer, '两周');
  assert.ok(!JSON.stringify(sessions).includes('DOM'));
});

test('两段会话独立保存，删除一段不影响另一段，示例不入库', () => {
  const storage = memoryStorage();
  saveSession(storage, session());
  saveSession(storage, {...session(),id:'b',updatedAt:3,turns:[{user:'示例',answer:'示例',status:'done',example:true}, {user:'另一个问题',answer:'回答',status:'done'}]});
  assert.deepEqual(loadHistory(storage).sessions.map(s=>s.id), ['b','a']);
  assert.equal(loadHistory(storage).sessions[0].turns.length, 1);
  deleteSession(storage,'b');
  assert.deepEqual(loadHistory(storage).sessions.map(s=>s.id), ['a']);
});

test('旧标签页不能覆盖更新后的会话；写入失败保留已保存内容', () => {
  const storage=memoryStorage();
  const original=session(); saveSession(storage,original);
  const older=loadHistory(storage).sessions[0];
  original.turns.push({user:'新补充',answer:'新回答',status:'done'}); saveSession(storage,original);
  assert.throws(()=>saveSession(storage,older), /HISTORY_CONFLICT/);
  assert.equal(loadHistory(storage).sessions[0].turns.length,3);
  storage.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>saveSession(storage,original), /quota/);
  assert.equal(loadHistory(storage).sessions[0].turns.length,3);
});

test('不静默截断长历史；损坏记录报告并保留原始值', () => {
  const storage=memoryStorage();
  const original=session(); original.turns=Array.from({length:80},(_,i)=>({user:`第${i}轮`,answer:'答'.repeat(6000),status:'done'}));
  saveSession(storage,original);
  const key=storage.key(0);
  storage.setItem(key.replace(/a$/, 'broken'), '{invalid');
  const loaded=loadHistory(storage);
  assert.equal(loaded.sessions[0].turns.length,80);
  assert.equal(loaded.sessions[0].turns[79].answer.length,6000);
  assert.equal(loaded.unreadable,1);
  assert.equal(storage.length,2);
});

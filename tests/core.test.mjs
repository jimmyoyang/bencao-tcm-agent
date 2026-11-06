import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../public/core.mjs';
import { splitAnswer, readCompletion, buildMessages, friendlyError, quickTestPrompt } from '../public/core.mjs';

test('追问元数据不会泄漏到回答中，未完成的标记也隐藏', () => {
  assert.deepEqual(splitAnswer('先规律作息。\n<<FOLLOWUPS>>["持续多久了？","还有什么不舒服？"]'), {
    text: '先规律作息。', followups: ['持续多久了？', '还有什么不舒服？']
  });
  assert.deepEqual(splitAnswer('先规律作息。\n<<FOL'), { text: '先规律作息。', followups: [] });
  assert.deepEqual(splitAnswer('回答\n<<FOLLOWUPS>>bad json'), { text: '回答', followups: [] });
  assert.deepEqual(splitAnswer('回答\n<<FOLLOWUPS>>["有效",null,123,"x","y","z"]'), {
    text: '回答', followups: ['有效','x','y']
  });
});

test('SSE 跨 UTF-8 字节、跨事件边界仍能完整显示，忽略 reasoning', async () => {
  const source = 'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\r\n\r\n' +
    'data: {"choices":[{"delta":{"content":"脾虚"}}]}\r\n\r\n' +
    'data: {"choices":[{"delta":{"content":"需要辨证。"}}]}\n\n' +
    'data: [DONE]\n\n';
  const bytes = new TextEncoder().encode(source);
  const stream = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } });
  const chunks = [];
  const text = await readCompletion(new Response(stream, { headers: { 'content-type': 'text/event-stream' } }), value => chunks.push(value));
  assert.equal(text, '脾虚需要辨证。');
  assert.equal(chunks.at(-1), text);
});

test('支持非流式返回，空响应和流内错误不能伪装成成功', async () => {
  const response = new Response(JSON.stringify({ choices: [{ message: { content: '你好' } }] }), {headers:{'content-type':'application/json'}});
  assert.equal(await readCompletion(response, () => {}), '你好');
  await assert.rejects(readCompletion(new Response('data: [DONE]\n\n', {headers:{'content-type':'text/event-stream'}}), () => {}), /EMPTY_RESPONSE/);
  await assert.rejects(readCompletion(new Response('data: {"error":{"message":"secret"}}\n\n', {headers:{'content-type':'text/event-stream'}}), () => {}), /MODEL_RESPONSE_ERROR/);
});

test('上下文只纳入已完成问答，保留首轮并限制体积', () => {
  const turns = [{user:'首轮', answer:'回答'}, {user:'中途失败', answer:'部分', status:'error'}, ...Array.from({length:20},(_,i)=>({user:`问题${i}`,answer:'答'.repeat(2000)}))];
  const messages=buildMessages(turns,'新的问题');
  assert.equal(messages[0].role,'system');
  assert.equal(messages[1].content,'首轮');
  assert.equal(messages.at(-1).content,'新的问题');
  assert.ok(!JSON.stringify(messages).includes('中途失败'));
  assert.ok(new TextEncoder().encode(JSON.stringify(messages)).length < 100000);
});

test('对外错误不暴露上游响应、Key 或内部地址', () => {
  assert.equal(friendlyError({status:429,message:'sk-sensitive'}), '提问有点密集，请稍后再试。');
  assert.ok(!friendlyError({message:'sk-sensitive https://internal'}).includes('sk-sensitive'));
  assert.match(friendlyError({code:'MODEL_NOT_CONFIGURED'}), /尚未接通/);
});


test('快测答案会整理成结构化上下文，不把选项包装成诊断', () => {
  const prompt = quickTestPrompt([
    { question: '现在最困扰什么', answer: '疲惫没精神' },
    { question: '大概多久了', answer: '1—2周' },
    { question: '希望先得到什么', answer: '日常调理' }
  ]);
  assert.match(prompt, /目前的小结/);
  assert.match(prompt, /疲惫没精神/);
  assert.match(prompt, /不是诊断/);
  assert.ok(!prompt.includes('你已确诊'));
});

test('快测后的追问保留全部选择，不只发送通用开场白', () => {
  const quickAnswers = [{question:'最困扰什么',answer:'睡不好'}, {question:'多久了',answer:'大约两周'}];
  const messages = buildMessages([{user:'我完成了快测',quickAnswers,answer:'请补充作息',status:'done'}], '经常两点睡');
  assert.match(messages[1].content, /睡不好/);
  assert.match(messages[1].content, /大约两周/);
  assert.equal(messages.at(-1).content, '经常两点睡');
});

test('就医摘要保留用户原话和快测信息，不混入 AI 推测、示例或后台提示词', () => {
  const summary = core.buildVisitSummary([
    {user:'示例症状',answer:'示例回答',example:true},
    {user:'我完成了快测',quickAnswers:[{question:'最困扰什么',answer:'睡不好'},{question:'多久了',answer:'大约两周'}],answer:'可能是某种疾病'},
    {user:'这两周经常凌晨两点睡。',answer:'模型的进一步推测'}
  ]);
  assert.match(summary, /睡不好/);
  assert.match(summary, /大约两周/);
  assert.match(summary, /这两周经常凌晨两点睡。/);
  assert.doesNotMatch(summary, /示例症状|某种疾病|模型的进一步推测|FOLLOWUPS|我完成了快测/);
  assert.match(summary, /请核对/);
});

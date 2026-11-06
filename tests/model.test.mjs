import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearModelConfig,
  endpointFor,
  getModelConfig,
  modelMode,
  normalizeConfig,
  requestModel,
  setModelConfig,
} from '../public/model.mjs';

test.afterEach(() => {
  clearModelConfig();
  delete globalThis.window;
  delete globalThis.fetch;
});

test('normalizes a secure base URL for both supported protocols', () => {
  const responses = normalizeConfig({protocol:'responses',baseUrl:'https://api.example.com',apiKey:'secret-key',model:'demo'});
  assert.equal(endpointFor(responses), 'https://api.example.com/v1/responses');
  const chat = normalizeConfig({protocol:'chat',baseUrl:'https://proxy.example.com/v1/',apiKey:'secret-key',model:'demo'});
  assert.equal(endpointFor(chat), 'https://proxy.example.com/v1/chat/completions');
});

test('rejects insecure non-local endpoints and malformed credentials', () => {
  assert.throws(() => normalizeConfig({baseUrl:'http://example.com',apiKey:'secret-key',model:'demo'}), /HTTPS/);
  assert.throws(() => normalizeConfig({baseUrl:'https://example.com',apiKey:'',model:'demo'}), /API Key/);
  assert.throws(() => normalizeConfig({baseUrl:'https://example.com',apiKey:'secret-key',model:''}), /模型/);
});

test('keeps BYOK configuration in memory and never exposes the key', () => {
  setModelConfig({protocol:'responses',baseUrl:'https://api.example.com',apiKey:'secret-key',model:'demo'});
  const config = getModelConfig();
  assert.deepEqual(config, {mode:'byok',protocol:'responses',baseUrl:'https://api.example.com',model:'demo',hasKey:true});
  assert.equal(modelMode(), 'byok');
});

test('uses POPO when no BYOK configuration exists', async () => {
  let called;
  globalThis.window={PopSDK:{model:{request:async (...args)=>{called=args;return new Response('{}',{status:200});}}}};
  const response=await requestModel({model:'demo',messages:[{role:'user',content:'hi'}],stream:true},{signal:null});
  assert.equal(response.status,200);
  assert.equal(called[1].path,'/v1/chat/completions');
});

test('sends Responses payload directly to the user endpoint', async () => {
  let request;
  globalThis.fetch=async (...args)=>{request=args;return new Response('{}',{status:200});};
  setModelConfig({protocol:'responses',baseUrl:'https://api.example.com',apiKey:'secret-key',model:'demo'});
  await requestModel({model:'ignored',messages:[{role:'system',content:'rules'},{role:'user',content:'hi'}],stream:true,max_tokens:100,temperature:0.2},{signal:null});
  assert.equal(request[0],'https://api.example.com/v1/responses');
  assert.equal(request[1].headers.Authorization,'Bearer secret-key');
  assert.deepEqual(JSON.parse(request[1].body),{model:'demo',input:[{role:'system',content:'rules'},{role:'user',content:'hi'}],store:false,stream:true,max_output_tokens:100,temperature:0.2});
});

test('URL 可粘贴完整路由，不接受参数、账号和非法协议',()=>{
  for(const url of ['https://api.example.com/v1','https://api.example.com/v1/responses']) {
    const value=normalizeConfig({protocol:'responses',baseUrl:url,apiKey:'secret-key',model:'demo'});
    assert.equal(endpointFor(value),'https://api.example.com/v1/responses');
  }
  for(const baseUrl of ['https://me:pass@api.example.com','https://api.example.com?key=secret','https://api.example.com#secret']) assert.throws(()=>normalizeConfig({baseUrl,apiKey:'secret-key',model:'demo'}));
  assert.throws(()=>normalizeConfig({protocol:'wrong',baseUrl:'https://api.example.com',apiKey:'secret-key',model:'demo'}));
  assert.throws(()=>normalizeConfig({baseUrl:'https://api.example.com',apiKey:'secret\nkey',model:'demo'}));
});

test('BYOK 请求禁止重定向、Cookie 和 Referer，不失败回退到 POPO',async()=>{
  let count=0,options;
  globalThis.window={PopSDK:{model:{request:()=>{count++;}}}};
  globalThis.fetch=async(url,init)=>{options=init;return new Response('',{status:401});};
  setModelConfig({protocol:'chat',baseUrl:'https://api.example.com/v1',apiKey:'secret-key',model:'demo'});
  await assert.rejects(requestModel({messages:[],stream:true}),{code:'BYOK_HTTP_ERROR',status:401});
  assert.equal(count,0);
  assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
});

test('测试连接必须能读取模型正文，不能把 HTTP 200 HTML 或空响应当成功',async()=>{
  const {testModelConfig}=await import('../public/model.mjs');
  const input={protocol:'responses',baseUrl:'https://api.example.com',apiKey:'secret-key',model:'demo'};
  globalThis.fetch=async()=>Response.json({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'连接成功'}]}]});
  assert.equal(await testModelConfig(input),true);
  assert.equal(modelMode(),'popo');
  globalThis.fetch=async()=>new Response('<html>login</html>');
  await assert.rejects(testModelConfig(input));
  globalThis.fetch=async()=>Response.json({});
  await assert.rejects(testModelConfig(input));
});

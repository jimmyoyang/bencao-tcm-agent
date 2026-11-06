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
  assert.deepEqual(JSON.parse(request[1].body),{model:'demo',input:[{role:'system',content:'rules'},{role:'user',content:'hi'}],stream:true,max_output_tokens:100,temperature:0.2});
});

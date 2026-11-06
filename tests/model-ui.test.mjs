import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('首页提供独立的模型连接入口和 BYOK 表单',()=>{
  assert.match(html,/模型连接/);
  assert.match(html,/id="model-base-url"/);
  assert.match(html,/id="model-api-key"/);
  assert.match(html,/id="model-name"/);
  assert.match(html,/Responses · \/v1\/responses/);
  assert.match(html,/Chat Completions · \/v1\/chat\/completions/);
  assert.match(html,/不写入 URL、浏览器存储、历史或 GitHub/);
});

test('应用通过模型适配层请求，不在业务页面保存 API Key',()=>{
  assert.match(app,/requestModel\(/);
  assert.doesNotMatch(app,/localStorage\.setItem\([^\n]*api.?key/i);
  assert.doesNotMatch(app,/sessionStorage\.setItem\([^\n]*api.?key/i);
});

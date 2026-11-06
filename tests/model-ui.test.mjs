import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const model=await readFile(new URL('../public/model.mjs',import.meta.url),'utf8');

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

test('发布页面没有作者共享模型调用、默认模型或恢复演示模式入口',()=>{
  assert.doesNotMatch(model + app,/PopSDK|config\.js/);
  assert.doesNotMatch(html,/POPO 演示模式|恢复 POPO/);
  assert.match(html,/配置自己的 API/);
  assert.match(html,/清除本页 API 配置/);
});

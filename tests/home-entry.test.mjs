import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('首页不展示与问诊重复的睡眠入口或场景入口', () => {
  assert.doesNotMatch(html, /最近睡不好？一起理清楚/);
  assert.doesNotMatch(html, /也可以从这里开始/);
  assert.doesNotMatch(html, /data-care-topic=/);
});

test('首页保留知识问答和日常偏好入口', () => {
  assert.match(html, /data-question="最近睡不好，日常可以怎么调整？"/);
  assert.match(html, /睡眠与作息/);
  assert.match(html, /日常偏好/);
});

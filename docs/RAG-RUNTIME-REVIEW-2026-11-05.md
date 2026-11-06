# 本草 RAG 运行时独立审查

审查日期：2026-11-05。审查范围为 `public/rag.mjs`、`app.js`、`core.mjs`、`history.mjs`、`care.mjs`、`metrics.mjs`、`image.mjs`、`policy.mjs`，以 `docs/superpowers/plans/2026-11-05-curated-rag.md` 为验收依据。

采用只读代码走查、实际索引检索及 Node 断言。未操作浏览器，未读取模型配置或凭据，未调用真实模型，未修改主代码。本报告接受已确认的“模型只选择 canonical claims，前端验证后展示固定结论”设计。

**最终结果：初审发现 2 项 P1、1 项 P2，均由实现方修复并通过独立复现复核。审查范围内未留下已确认的 P1/P2。最终完整 Node 测试 63/63 通过。** 此结果是程序边界验证，不是临床有效性、真实流量覆盖或引用人工医学复核结论。

## 发现与修复复核

### R1 · P1 · 结构化咨询风险被 RAG 入口丢弃 · 已修复

初审位置：`public/app.js` 的 `run()` 原有 `careTriage(...) === 'urgent'` 分支。只处理 urgent，忽略已有的 consult；新路径又通过 `turn.rag` 直接使用 `turn.risk`，不再保留旧 `riskFor()` 的结构化咨询判断。

三个无需特殊措辞的 UI 输入均可复现：

- 女性问卷选择“经期腹部不适”与“可能妊娠或正在哺乳”。初始 `context.population` 为 adult，普通检索返回 `a-women-01/02/05/06/04`。
- 睡眠问卷选择“入睡比较难”与“最近几乎不睡却异常兴奋”。初始普通检索返回 `sleep-go-to-bed-sleepy` 等 4 张卡，普通下一步包含睡眠 guide。
- 日常活动问卷选择“温和活动和八段锦”与“有伤病或医生要求限制运动”。初始仍返回普通运动卡片。

这些情形在 `careTriage()` 已是 consult，不依赖扩展临床词表；原流程仍会请求模型，模型若逐字返回召回卡片便通过 canonical 校验。

修复复核：`public/core.mjs:21` 的 `routeTurn()` 合并结构化 urgent/consult；`public/app.js:307` 统一调用并保存 gate 的人口限制，且在资料加载前结束 blocked 分支。`public/policy.mjs:47` 从问卷答案读取人口信息，女性合并选项作保守限制。上述三个原始输入现均为 `professional/consult`。女性限制经 `saveSession/loadHistory` 恢复后，切换消化、运动话题仍保留；普通弃答不会作为前轮安全拦截污染后续澄清。

### R2 · P1 · 无关人口否认清除了已知儿童限制 · 已修复

初审位置：`public/policy.mjs` 的 `populationOf()` 原 `return denied ? 'adult' : prior`。任何孕哺否认都被视为解除全部特殊人口限制。

复现序列：先输入“我是12岁，最近睡不好”，再输入“我不是孕妇，最近睡不好”，再输入“最近睡不好怎么办”。初始第二轮把 child 改为 adult，第三轮即可检索普通成人睡眠卡。

修复复核：`public/policy.mjs:20` 的否认判断限定到 prior 对应的限制。原序列现在始终保持 child、进入专业边界；哺乳者否认怀孕、孕期使用者否认哺乳，也不会解除原限制。明确“我是成年人”只解除 child。

### R3 · P2 · 否认人口词覆盖真实睡眠主题 · 已修复

初审位置：`public/policy.mjs` 的 `topicOf()` 在完整原文优先匹配“孕/哺乳”。

独立首轮输入“我不是孕妇，最近睡不好”被标为 women，实际索引返回女性卡 `a-women-01`、`a-women-07`；选择这些原句会通过引用校验，却未回答睡眠问题。“我没有怀孕，最近睡不好”则因同一错误主题出现空检索，错失已有的睡眠资料。

修复复核：`public/policy.mjs:30` 先移除明确否认的人口短语。两个原输入现在均为 sleep，实际返回 `sleep-months-consult`、`sleep-go-to-bed-sleepy`、`sleep-dinner-timing`、`sleep-evening-stimulants`，没有女性卡片。

## 其他边界检查

| 验收项 | 结果与证据 |
| --- | --- |
| 风险先于检索、模型 | `routeTurn()` 在 `loadKnowledge()` 前执行；三种结构化咨询案例及原有风险回归通过。 |
| 验证后渲染与保存 | `readCompletion()` 回调只检查中断，不写 `turn.answer`；完整输出通过 `validateResponse()` 后才生成展示文字。额外探针验证“已收到有效 JSON 后流中报错”仍抛错，不能按成功落库。 |
| 引用仅本轮允许卡片 | 使用实际索引，合法本轮卡验证成功；索引内但不在本轮的卡、空/null claim、错误结构、追加 HTML/治疗文本均弃答。 |
| 无依据及过期资料 | 未覆盖的“太溪穴在哪里”返回空；将日期推进到 2099 年后所有当前来源均不能检索。入口空检索分支在模型请求前结束。 |
| 过期健康事实 | 额外放入带唯一标记的过期问答、结构化事实，`buildMessages()` 输出不含任何旧标记；原始历史仍由历史模块保留。 |
| 历史与人口限制 | 实际调用保存、恢复，并用恢复后的 context 解析换主题问题，孕哺限制保留。 |
| 清除竞态 | 既有测试覆盖读写间插入清除、偏好写入间清除；额外状态探针确认清除后旧 epoch 无法重建历史或统计。源码中 `forgetInMemory()` 中断请求、标记 cleared、清除界面并使请求 finally 不回写。 |
| 本机统计 | 默认关闭时调用计数没有创建存储键；开启后仅固定枚举计数；清除后旧 epoch 不能重建。模块及调用点未见上传计数的网络路径。 |
| 图片本机预览/删除 | 源码仅使用 `createImageBitmap()` 与 blob URL；关闭、移除、清除全部都会撤销 URL，异步解码以 generation 防止旧预览恢复；未接入模型 payload 或上传请求。 |
| 知识 CTA | “什么是八段锦”“月经周期通常多少天”“健康饮食有哪些原则”的 `nextActions(..., 'general', true)` 均为空，不出现症状问卷或记录。 |

## 可重复验证

在项目根目录运行 `npm test`。最终审查运行退出码 0，63 项通过、0 失败。新增回归分别在 `tests/policy.test.mjs` 和 `tests/rag-history.test.mjs`；另外执行了不写文件的 Node 探针，覆盖本轮与跨轮来源、异常流、历史恢复、过期 prompt、统计同意和清除世代。

以下简短探针复验三个已修复发现：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveContext, routeInput} from './public/policy.mjs';
import {routeTurn} from './public/core.mjs';
import {retrieve} from './public/rag.mjs';
const bundle = JSON.parse(fs.readFileSync('./public/knowledge/index.json', 'utf8'));
for (const [topic, associated] of [
  ['women', '可能妊娠或正在哺乳'],
  ['sleep', '最近几乎不睡却异常兴奋'],
  ['wellness', '有伤病或医生要求限制运动'],
]) {
  const turn = {user:'补充情况', careData:{type:'intake', topic,
    answers:[{id:'associated', answer:associated}]}};
  turn.context = resolveContext(turn);
  assert.equal(routeTurn(turn).route, 'professional');
}
const child = resolveContext({user:'我是12岁，最近睡不好'});
const denial = '我不是孕妇，最近睡不好';
const restricted = resolveContext({user:denial}, child);
assert.equal(restricted.population, 'child');
assert.equal(routeInput(denial, restricted).route, 'professional');
const ordinary = resolveContext({user:denial});
const result = retrieve(denial, ordinary, bundle, {today:'2026-11-05'});
assert.equal(ordinary.topic, 'sleep');
assert.ok(result.cards.length);
assert.ok(result.cards.every(card => card.topic === 'sleep'));
```

浏览器布局、真实模型接口、线上发布和临床引用审核不在本次独立运行时审查的实测范围内，由对应验收记录说明。

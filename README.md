# 本草 · 中医健康助手

访问 [POPO 作品页](https://bencao-tcm-tm.popo.baidu-int.com/)；外部访问可使用[授权链接](https://bencao-tcm-tm.popo.baidu.com/?k=psajtik7)。模型 Key 只在 POPO 服务端，前端模型 ID 为 gpt-6.1-sol。

## 本轮版本

这是六主题精选知识卡片 RAG Demo：睡眠、疲惫、消化、女性日常、情绪压力、日常活动。80 张卡、19 个官方/医院来源。女性日常是可选场景，未实现周期预测或自动推测情绪。内容以一般健康教育为主，辅以少量中医养生、导引和穴位位置科普；不能称为中医辨证问诊库。没有全网搜索、处方、舌图诊断、跨设备健康档案。

首页入口已收敛：移除与结构化问诊重复的“最近睡不好？一起理清楚”和“也可以从这里开始”场景栏，保留睡眠知识问答、问答后的建议卡和日常偏好入口。

先做确定性风险/特殊人群分流，再做主题/意图/人群/日期过滤及本地 BM25，最多提供 5 张卡，资料上下文不超过 6000 字符。缓存最多 64 项，仅在内存。模型选择 1–3 条结论，页面验证 ID、来源和逐字结论后才呈现维护的行动及边界；未经校验的流式文本既不展示也不保存。无匹配或输出不合规时明确停止，保持问题历史供继续澄清。

知识问题不产生症状问卷；每轮存 intent/topic/confidence/population/risk、检索及引用 ID、证据快照。问卷可跳过、修改、撤回；后续最多一主一次 CTA。完整历史留在本浏览器，导出可带走。健康事实用于后续上下文最长 7 天，偏好最长 30 天；特殊人群限制不能因为换主题或无关否认而自动清除。本机清除有世代保护，防止其他旧标签页重写。

使用统计默认关闭，主动打开后只在本机累计固定计数，不存问题、主题或身份，不上传。照片入口只做本机临时预览、格式/大小/分辨率与本机曝光/细节提示，关闭即撤销；不识别舌象、不上传、不持久保存。

## 资料与限制

JSONL 在 data/knowledge-cards.jsonl；来源注册表、域名白名单和含完整卡片的倒排索引在 public/knowledge/。POPO 不接受 .jsonl 文件，页面使用 JSON 索引，原始编写数据在 data/，构建工具在 tools/build-knowledge.mjs。引用对应结论/行动/原文短摘录/支持范围/不确定性，来源包含原文日期、抓取核对日期、原站复核日期及项目复核截止日。

来源由 AI 辅助核对，**人工医学复核尚未完成（卡片 0/80、来源 0/19）**。卡片审核在 docs/review/citation-human-review.json，来源审核在 docs/review/source-human-review.json；不能把 AI 复核当作人工正确率。NHS/WHO 的一般健康教育也不能等价中国个体诊疗规范。八段锦仅收录有限的官方医院知识；新增足三里、内关的位置科普与足三里经络归属，不提供针刺、艾灸深度/时长；未核对的穴位定位明确不答。

`public/knowledge/index.json` 是实验性演示索引，`public/knowledge/verified-index.json` 是人工审核上线门禁。当前门禁状态为 `blocked`、0 张卡，未审核内容不会被标为已核验资料。审核状态、角色、来源新鲜度和问题编码见 docs/review/REVIEW-GUIDE.md。

## 运行与验证

```sh
npm run build
npm test
npm run evaluate
python3 -m unittest discover -s tests -p 'test_*.py'
npm start
```

静态本地页面为 http://127.0.0.1:8765/ ，POPO SDK 仅在发布页面注入。浏览器模拟测试用 `python3 tests/serve_fixture.py 18768`；本地页面明确标注模拟请求，测试目录不发布。`#forged`、`#missing-meta`、`#failure`、`#slow` 分别模拟不受支持正文、缺少风险字段、服务失败和慢流。

自动测试覆盖来源校验、上下文裁剪、SSE、风险、撤回、完整历史、清除竞态、使用计数及图像格式限制。85 条检索/答案契约回归与 100 条安全红队均为合成数据。保留独立口语题首次评估失败报告，修正后不再把同一套题称为盲测。真实用户覆盖、满意度、人工引用正确率尚未测量。

实施计划 docs/superpowers/plans/2026-11-05-curated-rag.md；来源记录 docs/research/rag-a.md 与 rag-b.md；两份独立 AI 评审 RAG-CORPUS-REVIEW 和 RAG-RUNTIME-REVIEW 记录全部发现及修复。历史版本验收保留在 docs/。

## 发布与恢复

只发布 public/（包括知识卡与来源，不包括聊天、测试、配置工具和文档）。沿用 .popo.json 中的作品记录与可见性，通过官方 POPO upload.py 更新。每次发布产生新版本；本轮前的 ZIP 为 ../tcm-agent-backups/bencao-before-rag-20261105-014447.zip。

需要重新绑定模型时可运行 tools/model_setup.py，在本机表单填写；不要把 Key 放入源码或聊天。当前配置无需重新填写。

本轮交付与已知限制详见 docs/ACCEPTANCE-RAG-2026-11-05.md，线上检查见 docs/LIVE-RAG-CHECKS-2026-11-05.json。12轮历史及16条依据已验证刷新恢复；周期计数知识题的误拦截已修复，真实出血风险继续分流；人工医学复核未完成。线上 v16 备份为 ../tcm-agent-backups/bencao-rag-delivery-20261105-v16.zip，v15 及审核门禁中间备份仍保留。

本机图片用256像素以内样本做曝光与细节启发式提示，不识别舌象或判断颜色真实性。合成图片已通过实际解码、预览、清除流程；原生文件选择器自动化仍受Chrome扩展文件URL权限限制。后续人工审核流程见 docs/review/REVIEW-GUIDE.md。

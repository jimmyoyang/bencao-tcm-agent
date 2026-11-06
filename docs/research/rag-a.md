# RAG 资料核对 A 组

核对日期为 2026-11-05。已读取 9 个 NHS 官方页面，形成 36 条中文原子卡，fatigue、women、stress 各 12 条；每页支持 4 条卡。数据位于 `data/rag-a-sources.json` 和 `data/rag-a-cards.jsonl`。

## 核对方式与状态

Firecrawl CLI 在主任务中已确认未认证。本组按已确定的回退方式，以公开 HTTPS GET 读取页面，Python 标准库解析可见 HTML 正文。9 页均返回 HTTP 200；痛经页由旧路径重定向至 `/symptoms/period-pain/`，来源数据已保存最终 URL。没有登录、付费材料或营销内容，也没有把完整页面放入 public。

卡片的 `sourceSpan` 保存标为“原文引文”的英文短摘录，`claim` 是中文释义。32 条引文与本次抓取正文完成忽略空白差异的程序逐字匹配；首个疲劳页的 4 条引文与本次工具返回的完整正文逐条核对。JSON 与 JSONL 均检查解析、必填字段、唯一 ID、来源引用、卡片数量和主题数量。

所有来源的审核状态均为 `machine-checked; human-review-pending`，审核者均为 `Codex source extraction`。这表示公开文本抓取和整理已完成，**不表示医学专家或人工编辑已审核**。`official-health` 表示发布机构类型，不是临床研究证据等级，也不能等同于疗效强证据。

## 来源与真实核对要点

| 来源 ID | 官方页面 | 页面自身复核日 | 原定下次复核日 | 本次采用内容 |
| --- | --- | --- | --- | --- |
| nhs-fatigue | [Tiredness and fatigue](https://www.nhs.uk/conditions/tiredness-and-fatigue/) | 2023-06-02 | 2026-06-02 | 疲劳原因多样；持续不明原因疲劳或影响生活需评估；规律作息；睡前放松 |
| nhs-fatigue-self-help | [Self-help tips to fight tiredness](https://www.nhs.uk/live-well/sleep-and-tiredness/self-help-tips-to-fight-fatigue/) | 2023-11-08 | 2026-11-08 | 规律进餐；咖啡因可扰乱睡眠；酒精降低睡眠深度；轻度缺水有时会导致疲倦 |
| nhs-insomnia | [Insomnia](https://www.nhs.uk/conditions/insomnia/) | 2024-03-19 | 2027-03-19 | 成人平均睡眠参考；有睡意再上床和固定起床；困倦不驾车；长期或影响生活的睡眠问题应就医 |
| nhs-periods | [Periods](https://www.nhs.uk/conditions/periods/) | 2023-01-05 | 2026-01-05 | 周期和出血天数的一般范围；少量经血可呈粉色或棕色；非经期、性交后和绝经后出血应检查 |
| nhs-period-pain | [Period pain](https://www.nhs.uk/symptoms/period-pain/) | 2026-03-18 | 2029-03-18 | 隔布温热敷；轻柔活动；部分痛经存在疾病原因；影响日常生活应就医 |
| nhs-pms | [PMS (premenstrual syndrome)](https://www.nhs.uk/conditions/pre-menstrual-syndrome/) | 2024-06-18 | 2027-06-18 | 经前症状会变化；记录至少两个周期；规律运动、均衡饮食与睡眠；补充疗法证据有限 |
| nhs-stress | [Get help with stress](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/) | 2026-03-06 | 2029-03-06 | 小目标；向信任的人或专业人员表达感受；为压力日程提前准备；无法应对或自助无效时寻求帮助 |
| nhs-anxiety | [Get help with anxiety, fear or panic](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anxiety-fear-panic/) | 2026-07-13 | 2029-07-13 | 不自行诊断；活动可帮助放松；规律进餐；避免以酒精、烟草、赌博或药物滥用应对焦虑 |
| nhs-breathing | [Breathing exercises for stress](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) | 2026-06-12 | 2029-06-12 | 日常练习；舒适体位；不强迫深呼吸；轻柔鼻吸口呼与可选计数 |

页面未显示独立发布日期，故所有 `publishedAt` 保留 null。`reviewedAt` 只采用页面底部的 Page last reviewed，不采用音视频 Media last reviewed。`checkedAt` 是本次读取日期。`expiresAt=2027-02-05` 是本项目要求的再次核验日期，不能解释为网站或医学结论有效期。

## 采用范围

- 仅用作普通成年人的健康教育、低风险生活方式信息和资料适用边界，不含药物、草药或补充剂剂量。
- 各卡 `risk=low` 描述知识卡内容的用途，不代表提出问题的人处于低风险。就医提示属于资料边界，不能替代系统独立的危险信号分流。
- 孕期、哺乳期和儿童从本次可用人群中排除。这是保守的产品范围限制，不声称这些来源中的所有行为对这些人群有医学禁忌。
- 女性健康卡适用于有相应月经或出血问题的成年人；来源里适用于女孩的内容未移植为儿童建议。成年未孕者经期异常仍可能需要妊娠评估，不可由排除标签自动排除怀孕。
- 中文 action、contraindication、supportScope 和 uncertainty 含谨慎应用边界及产品限制；未逐字取自来源的边界不应展示为 NHS 原话。尤其防烫、活动不适停止、急症分流和本地服务替换是保守限制，不是页面提供的个体化临床判断。
- 这些材料不支持“气血不足”“肝郁”等证型诊断，不支持本草疗效推断，也不支持以健康教育代替医学诊疗。不得把来源里的 “may/can/try” 生成成保证有效。

## 尚未解决与应复核事项

1. `nhs-fatigue` 与 `nhs-periods` 已超过来源标注的下次复核日期；本次仍可访问不等于其临床更新已完成。`nhs-fatigue-self-help` 距原定复核日仅三天，建议优先复核。来源表和数据保留真实日期，未伪造更新。
2. 全部材料来自同一官方机构，提供来源级可追溯性，但不构成多机构交叉验证。尚无中国本土专家审核，也没有中国人群适用性的专门验证。
3. NHS 两页分别给出一般疲劳自助中的 6–9 小时与失眠页的成人平均 7–9 小时。固定作息卡不提取前者的时长，只由失眠页支持“平均 7–9 小时且个体不同”，避免混合成统一处方。
4. 痛经、异常出血、持续疲劳和焦虑的具体病因、治疗适应证及紧急程度不能由这些卡片确定。没有把页面中“惊恐发作一般无危险”的句子用于排除胸痛或呼吸困难的急症。
5. 页面出现英国 GP、111、999 及 NHS 转诊信息。本次卡片改写为当地医疗或心理支持，不向中国用户推荐英国急救号码；具体地区服务入口仍由产品安全流程决定。
6. 人工医学审稿未完成。本次机器核对只能确认已读页面与提取内容的对应关系，不能为医学正确性、完整性或临床适用性背书。

## 校验摘要

9 个唯一来源 ID，36 个唯一卡片 ID；每来源 4 卡；三个主题各 12 卡；全部引用存在；所有卡片都有中文检索词、单条结论、行动建议、禁忌/限制、引文、适用范围与不确定性。全部风险字段为 low，来源等级为 official-health，核对日为 2026-11-05，审核状态真实保留为人工待审。

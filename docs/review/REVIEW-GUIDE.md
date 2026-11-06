# 人工引用与知识库上线门禁交接

当前冻结版本为 **80 张卡、19 个来源**。机器抓取、字段整理和程序一致性检查已经完成，但人工医学/引用审核尚未开始：**卡片审核完成 0/80，80/80 为 pending；来源审核完成 0/19，19/19 为 pending**。这不是临床准确率，也不能解释为中医辨证能力。

`citation-human-review.json` 是卡片级审核表，`source-human-review.json` 是来源级审核表。`public/knowledge/index.json` 是实验性资料索引；`public/knowledge/verified-index.json` 是上线门禁输出。当前 verified index 为 `blocked`、0 张卡，未审核卡片不能被标为“已核验依据”。

## 审核通过口径

冻结版本的全部 80 张 active cards 固定为分母。`pending`、`blocked`、`needs-adjudication`、`rejected` 都不能从分母中删除；修订内容应生成新版本并重新计算。

本轮分开记录三项结果：

- **引用支持率**：claim、action 是否被来源原文支持。
- **适用边界通过率**：人群、禁忌、排除条件、supportScope 和 uncertainty 是否完整且没有扩大适用范围。
- **安全门禁通过率**：高风险问题是否阻止普通调养建议，目标为 100%。

目标是冻结版本中引用支持与适用边界的通过率达到 95% 以上，安全门禁达到 100%。这不代表临床准确性、中医辨证能力、急症召回率或真实用户满意度。

## 先审来源，再审卡片

来源级审核在 `source-human-review.json`：

1. 核对发布机构、标题、原文日期和页面访问情况。
2. 填写 `sourceAccessedAt`；如要保证可复现，保存原文快照的 SHA-256 到 `sourceSnapshotHash`。
3. 核对原站复核日期。项目 `expiresAt` 只是本项目计划复核时间，不能延长原站有效性。
4. 填写 `sourceFreshnessVerdict`：`current`、`stale` 或 `blocked`。
5. 填写 `sourceReviewStatus`：`pending`、`accepted`、`rejected`、`blocked` 或 `needs-adjudication`。

当前已识别为原站复核日期过期的来源包括 `nhs-fatigue`、`nhs-periods`、`nhs-constipation`。它们可以作为待审材料保留，但在重新确认内容有效性前不能标为 `accepted`。来源打不开、无法确认原文或无法保存必要证据时使用 `blocked`。

卡片级审核在 `citation-human-review.json`：

1. 判断 `claim` 是否被 `sourceSpan` 支持。
2. 判断 `action` 是否超出原文，是否把群体健康建议写成个人建议。
3. 检查 `contraindication`、`populations`、`exclusions`、`supportScope` 和 `uncertainty`。
4. 分别填写 `citationVerdict` 与 `safetyVerdict`，再填写总的 `reviewStatus`。
5. `humanVerdict` 是兼容旧表的总状态别名，必须与 `reviewStatus` 保持一致。
6. 审核通过需要填写真实的 `humanReviewer`、`reviewerRole`、`humanReviewDate`；代理不得代填。

## 状态、角色和问题编码

卡片及来源总状态允许：

- `pending`：尚未完成。
- `accepted`：满足当前审核门槛。
- `rejected`：存在已确认的问题，需修订。
- `blocked`：来源不可访问、过期未复核或证据不足。
- `needs-adjudication`：两位审核者意见冲突，等待仲裁。

审核角色使用固定值：

- `medical-editor`
- `tcm-clinician`
- `public-health-reviewer`

中医体质、穴位、经络和经期调养内容应由中医专业人员审核；NHS/WHO 一般健康信息可以由医学编辑或公共卫生背景人员审核，但不能据此证明中医临床适用性。卡片作者不能独立审核自己的卡片。高风险卡片和争议卡片建议由第二位审核者复核，意见冲突进入 `needs-adjudication`。

`issueCodes` 使用固定编码：

- `quote-not-found`
- `claim-too-broad`
- `action-not-supported`
- `missing-condition`
- `population-mismatch`
- `outdated-source`
- `translation-risk`
- `unsafe-self-care`
- `tcm-scope-overreach`
- `source-unavailable`

自然语言问题继续写入 `comment`，不要用姓名代替资质证明。

## 内容类型边界

每张卡有 `knowledgeType`：

- `general-health`：一般健康教育。
- `tcm-culture`：中医养生、导引、经络术语和有限的位置科普。
- `tcm-clinical`：只有经过中医专业人员审核后才能使用的临床知识。
- `safety`：就医边界、风险提醒和不安全自我处理的阻止。

位置科普另用 `knowledgeSubtype: point-location` 标记。当前资料约 68 张来自 NHS/WHO，约 12 张来自中国官方或医院，因此产品应称为“中医健康信息助手”或“中医养生与健康知识 Demo”，不能称为已经具备中医辨证问诊能力。

## 上线门禁

`tools/build-knowledge.mjs` 每次构建都会重新生成两个审核表，并输出 `public/knowledge/verified-index.json`。只有同时满足以下条件的卡片才会进入 verified index：

- 卡片 `reviewStatus`、`humanVerdict`、`citationVerdict`、`safetyVerdict` 都为 `accepted`。
- 审核人、审核角色和审核日期齐全。
- 对应来源 `sourceReviewStatus=accepted`、`sourceFreshnessVerdict=current`。
- 来源有 `sourceSnapshotHash`。
- 没有未处理的 `rejected`、`blocked` 或 `needs-adjudication`。

在人工审核完成前，所有卡片保持 `pending`，产品只作为实验性知识问答 Demo 使用。`index.json` 仍用于演示和工程回归，但不能把它的内容称为已核验资料。

## 真实问题集

真实问题评估应保留采集与授权记录：

- 来源渠道、授权方、采集时间范围和脱敏方式。
- 抽样方式、各主题样本数量和意图标注规则。
- 训练/调参集与独立评估集的隔离方式。
- 原始风险标签是否保留。
- 两名标注者独立标注及一致性结果。

当前 85 条检索题是合成开发数据。独立首次 holdout 的 8/24（33.3%）和调参后的 22/25（88%）都应保留；82/85（96.47%）只是开发集结果，不能称为盲测，也不能证明真实用户覆盖率达到 80%。

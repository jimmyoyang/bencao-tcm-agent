# 本草 RAG 来源核对记录 · B 组

核对日期 2026-11-05（Asia/Shanghai）。本组包含 9 个官方或医院来源、40 条原子卡。睡眠 12 条、消化 16 条、日常养生 12 条。

本次沿用 `sleep-core`、`baduanjin`、`nhs-insomnia` 三个来源 ID，并重新读取原站。已有核对记录见 `docs/research/2026-11-05-sleep-sources.md`。全部来源均为机器读取与文本核对，**尚无人类医学审核，也没有临床验证**。

## 获取与核对方法

- 已读取 firecrawl / firecrawl-scrape 技能。主任务已确认 Firecrawl CLI 未认证，因此没有伪称使用 Firecrawl 抓取。
- 8 页通过公开 HTTPS GET 获取原站 HTML，去掉脚本、样式及标签，保留正文文字后核对标题、机构、日期与相关段落。
- 国家卫健委页面直接 HTTP 返回 412，改用 Chrome cua 打开同一原始 URL，通过页面可见正文与 `body.innerText` 核对。没有绕过浏览器安全警告或验证码。
- 每条卡的 `sourceSpan` 为实际读取的短摘录。英文来源保留英文原句，中文 `claim` 为限定范围的摘要；不会把中文摘要当成原文引语。
- 完整页面仅临时用于核对；仓库只留摘要、短摘录与校验指纹，未把完整版权内容复制到 `public/`。未上传用户健康描述。

## 来源目录

| ID | 原站标题与链接 | 页面日期及含义 | 卡数 | 获取方式 |
|---|---|---|---:|---|
| `sleep-core` | [全国爱卫办发布睡眠健康核心信息及释义](https://www.nhc.gov.cn/guihuaxxs/c100133/202503/70d5836afe804a858b899ee951a24a13.shtml) | 发布 2025-03-18 | 6 | Chrome 可见正文 |
| `baduanjin` | [天坛科普——八段锦 老祖宗传下来的助眠秘方](https://wjw.beijing.gov.cn/bmfw_20143/jkzs/jksh/202503/t20250317_4036769.html) | 发布 2025-03-17 | 2 | 公开 HTTPS HTML 文本 |
| `nhs-insomnia` | [Insomnia](https://www.nhs.uk/conditions/insomnia/) | 页面审阅 2024-03-19 | 6 | 公开 HTTPS HTML 文本 |
| `nhs-bloating` | [Bloating](https://www.nhs.uk/conditions/bloating/) | 页面审阅 2026-01-21 | 4 | 公开 HTTPS HTML 文本 |
| `nhs-heartburn` | [Heartburn and acid reflux](https://www.nhs.uk/conditions/heartburn-and-acid-reflux/) | 页面审阅 2023-11-20 | 4 | 公开 HTTPS HTML 文本 |
| `nhs-constipation` | [Constipation](https://www.nhs.uk/conditions/constipation/) | 页面审阅 2023-10-26 | 4 | 公开 HTTPS HTML 文本 |
| `nhs-diarrhoea` | [Diarrhoea and vomiting](https://www.nhs.uk/conditions/diarrhoea-and-vomiting/) | 页面审阅 2023-12-21 | 4 | 公开 HTTPS HTML 文本 |
| `who-healthy-diet` | [Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) | 页面所示日期 2026-01-26 | 5 | 公开 HTTPS HTML 文本 |
| `who-physical-activity` | [Physical activity](https://www.who.int/news-room/fact-sheets/detail/physical-activity) | 页面所示日期 2026-11-04 | 5 | 公开 HTTPS HTML 文本 |

NHS 页面未显示初始发布日期，`publishedAt` 记为 null；`reviewedAt` 取 “Page last reviewed”。WHO 页面仅显示日期，未区分初始发布和审阅，因此 `publishedAt` 也为 null，`reviewedAt` 仅保存页面日期，并在来源摘要说明。中国两页明确标注发布时间，分别记入 `publishedAt`。

## 原文定位与取舍

### sleep-core

发布机构为全国爱卫办、国家卫生健康委员会。定位正文第二、四、七、八项。

短摘录：“不同年龄段人群对睡眠时长的需求不同，且存在个体差异。”

采用睡眠需求差异、饮食与设备习惯、打鼾伴呼吸间歇的专业评估提示、中医辨证边界。没有把页面人群睡眠时长或固定钟点变成个人硬性目标。

### baduanjin

来源为首都医科大学附属北京天坛医院，由北京市卫生健康委员会转载。定位正文八段锦介绍、末段视频指引。

短摘录：“练习时通过调节心理、活动身体、配合呼吸”

只保留动作与呼吸配合，以及原文推荐演练视频的入口。原文中的“神器”“全家老小都能练”、动作对应脏腑或治病结论、未附研究细节的疗效断言均不采纳。本次没有核对该视频内容，不把医院的推荐冒充对视频本身的核验。

### nhs-insomnia

定位 “How you can treat insomnia yourself” 和 “See a GP if”。

短摘录：“only go to bed when you're sleepy”

采用困意后上床、固定起床、睡前放松、睡眠环境、困倦不驾驶、持续数月时就诊；不收录助眠药的选择、剂量或疗程。

### nhs-bloating

定位 “How to reduce bloating” 和 “See a GP if”。

短摘录：“chew with your mouth closed to avoid swallowing air”

采用闭口咀嚼、少量多餐、少喝碳酸饮料、反复腹胀就诊。没有收录腹部按摩方向或把所有产气食物列为永久禁食。

### nhs-heartburn

定位 “How you can ease heartburn and acid reflux yourself”。

短摘录：“do not eat within 3 or 4 hours before bed”

采用睡前进餐间隔、衣着、个人诱因及不要自行停处方药。不把胸痛一概归因反酸，也未收录垫高床头的工程操作或药物细节。

### nhs-constipation

定位 “How you can treat and prevent constipation yourself”。

短摘录：“gradually increase the fibre in your diet”

采用逐步增加纤维、如厕规律、不拖延便意、日常步行。正文上次审阅 2023-10-26，Next review due 2026-10-26 已过。页面内视频 Media last reviewed 2026-05-12 不等于正文更新，不冒充正文复核日期。本组四张卡已加时效限制，需优先再审。

### nhs-diarrhoea

定位 “How to treat diarrhoea and vomiting yourself”、“To help avoid spreading an infection” 和 “Urgent advice”。

短摘录：“drink lots of fluids, such as water or squash – take small sips if you feel sick”

只选成人的饮水方式、避免果汁汽水、肥皂水洗手、无法留住液体时就医。原站包括儿童建议，本组没有外推到儿童。英国 111/999 等服务号码不作为中国就医路径。

### who-healthy-diet

定位 “Overview”、“Carbohydrates” 和 “Salt/sodium and potassium”。

短摘录：“diversity : inclusion of a wide variety of nutritious foods within and across food groups.”

采用食物多样性、碳水来源、冷冻或罐装果蔬的条件、果汁游离糖、烹调减盐。未给出个人热量、蛋白质、盐摄入处方，不推荐含钾代盐。

### who-physical-activity

定位 “Overview”、“Benefits of physical activity” 和 “How much physical activity is recommended”。

短摘录：“any amount of physical activity is better than none”

采用身体活动定义、少量活动的价值、减少久坐、肌力活动、规律活动对身心健康的一般价值。仅支持一般成人知识，不证明任何具体运动、八段锦或个体疗效。

## 数据边界与验证

- `risk: low` 指卡片内容为一般信息或低风险行动、就诊提示，**不是对用户病情的风险判定**。危险信号需由应用优先分流，本数据不能作为完整急诊判定清单。
- `populations/exclusions` 是本演示的检索范围，仅一般成人，排除孕期、哺乳期与儿童。这不是断言原始来源不适用于这些人群，也不是把怀孕、哺乳或儿童身份当成医学禁忌。
- `contraindication` 包含保守的产品适用边界；不声称每一项均来自该条短摘录。`action` 只作原子结论的日常落实，不能被渲染成完整治疗方案。
- `expiresAt: 2027-02-05` 是演示数据的计划复核时间，不能替代来源自己的审阅日期，也不表示来源保证有效至该日。NHS 便秘来源已单列更早的复核缺口。
- 本组没有核验可用的穴位定位图或按压教学，因此没有新增穴位定位、按压时长、针灸操作等卡片；这不表示权威来源不存在。
- JSON/JSONL 已逐行解析；9 个来源 ID 与 40 个卡片 ID 唯一；每条引用可解析；主题、意图、风险、证据级别、人群字段符合约定；每主题至少 12 条。
- 34 条公开 HTTP 来源卡的摘录自动核对为正文连续子串；6 条卫健委卡与 Chrome 实际可见正文核对。无药物剂量。
- `reviewer` 统一为 `Codex source extraction`，`reviewStatus` 统一为 `machine-checked; human-review-pending`。不得改写成“医生审核”“临床验证”或“全部回答已验证”。

## 核对材料指纹

以下 SHA-256 针对本次去标签、归一化空白后的临时正文，不是原始 HTML 校验值或签名。临时文件可能被环境清理；可通过原始 URL 和卡片短摘录重新核对。卫健委使用浏览器可见文本，未生成指纹。

| 来源 ID | 临时正文 SHA-256 |
|---|---|
| `baduanjin` | `4773e8daa89d355cd4a8232fd514ccb0dcfb0250c036edd577c496ea08e986d8` |
| `nhs-insomnia` | `06c357474a8caba7925c2cfcbe27d9278f7369f493bcb121801a6865387dac38` |
| `nhs-bloating` | `b061f613724b43774da1d43530eb63b63610c4dc4e0ec2ea03a260876ac36e77` |
| `nhs-heartburn` | `7f45286cc6bfccd6508bb5bcbad0ab2a15bf3039fee7465522c1351b107a3cd4` |
| `nhs-constipation` | `1aec51600f389df3a7daf78f4240ad6e792e2264bf196c63addbe0d7f0263811` |
| `nhs-diarrhoea` | `d54781764ae693823bc9ad86aed65ba5f4f3a6931115ac0ef2f9bc16718ec44a` |
| `who-healthy-diet` | `7df78ce9440500df289c7f36313a2ddba18b79a77149225c4607d094f5a1914f` |
| `who-physical-activity` | `23c6c608859bda32a508888d35bff835ebd3c1af08cbd85a6897a64fbc7c0347` |

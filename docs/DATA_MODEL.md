# Dedicated to Fx — 数据模型

> 本文描述 MVP 的概念数据模型、IndexedDB/Dexie 持久化边界、版本迁移与备份格式。字段名是设计契约，不代表已经开始实现。

## 1. 建模目标

数据模型必须支持以下事实：

1. 一个表达可以在多篇文章、多个句子中反复出现。
2. 同一表达的每次出现拥有不同的当前语境含义。
3. 核心概念属于跨语境的教学模型，不能与某次中文解释混为一体。
4. 用户的猜测、提示路径、错误和修订是学习证据，不能只保留最终答案。
5. 文章内容更新后，历史学习记录仍应能还原当时看到的原句。
6. 所有数据在本地保存，并能以有版本的格式完整导出。

## 2. 数据边界

### 2.1 内容数据 Content Data

由应用版本提供或用户明确下载：

- 文章正文与元数据。
- 预策划表达。
- 上下文线索、英文解释、核心概念和相关语境。
- 迁移练习题面与参考反馈。
- 来源、许可和内容版本。
- 开放许可基础学习词典的静态分片：规范词形、音标、一般词性、简明英文释义、中文辅助与词形关系。

内容数据可以随应用更新，但更新必须按 contentVersion 管理。

基础词典是可重新下载的静态内容，不是用户学习记录：

- 不写入业务 Dexie 表，也不进入个人 JSON 备份。
- 前缀分片首次查询时从 GitHub Pages 同源静态资源获取，并由 Service Worker Cache Storage 按版本缓存。
- 缓存缺失或被系统清理不会删除 Encounter、猜测或文章，只会让未缓存词条暂时需要联网重新获取。
- DictionaryEntry 只表示一般词典信息，不与 LearningUnit、Contextual Meaning 或 ExpressionConcept 合并成同一实体。
- 词典来源、许可证、构建筛选规则和数据版本必须随发布保留。

### 2.2 用户数据 User Data

由学习行为产生：

- 阅读位置和完成记录。
- 选中的表达与上下文快照。
- 猜测、笔记、提示展开深度。
- 迁移练习回答、错误类型和自评。
- 复习计划和理解状态。
- 私人日记、每日习惯完成记录和个人计划。
- 设置、备份提示状态。

用户数据不得因内容包升级或应用缓存刷新而丢失。

### 2.3 派生数据 Derived Data

首页统计、最近学习列表、理解摘要等应优先从原始记录计算或可重建缓存生成。导出时可省略可安全重建的缓存。

## 3. 核心关系

~~~
Article 1 ─── n ArticleBlock
Article 1 ─── 1 ArticleProgress
Article 1 ─── n Encounter

ExpressionConcept 1 ─── n Encounter
Encounter 1 ─── n ExplorationSession
Encounter 1 ─── n PracticeAttempt

ExpressionConcept 1 ─── 1 LearningSummary
ExpressionConcept 1 ─── 1 ReviewSchedule
LearningUnit n ─── 1 ExpressionConcept
LearningUnit 1 ─── n RelatedContext
~~~

关键区分：

- ExpressionConcept 表示跨语境可连接的表达与核心概念。
- Encounter 表示用户在一处具体文本中的一次遇见。
- ExplorationSession 表示用户针对一次遇见的学习过程。
- LearningSummary 是依据历史证据形成的当前摘要，不覆盖原始记录。

## 4. 实体定义

### 4.1 Article

文章及其发布元数据。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 稳定 ID，建议带命名空间 |
| slug | string | 人类可读的稳定标识 |
| title | string | 英文标题 |
| subtitle | string? | 可选副标题 |
| summary | string | 简短英文简介 |
| topicTags | string[] | art、nature、cet4 等 |
| difficulty | string | MVP 使用有限枚举，不伪装成精确分数 |
| estimatedMinutes | number | 预计阅读时长 |
| source | SourceInfo | 作者、出处与链接 |
| sourceUrl | string? | 事实参考来源链接；原创改写与原网页必须区分 |
| license | LicenseInfo | 许可名称与归属文本 |
| contentVersion | number | 内容版本 |
| origin | built_in / imported | 内置内容或 Fx 本地导入 |
| importedAt | ISODate? | 本地导入时间 |
| publishedAt | ISODate? | 原文发布时间 |
| blocks | ArticleBlock[] | 有稳定 ID 的正文块 |
| featuredExpressions | string[] | 预策划 LearningUnit ID |
| installedAt | ISODate | 本地安装时间 |
| updatedAt | ISODate | 本地内容更新时间 |

ArticleBlock 至少包含 id、type 和 text，并可包含 translationZh。MVP 的 type 支持 paragraph、heading、quote；不把整篇文章存成不可定位的单一 HTML 字符串。

| ArticleBlock 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 文章内稳定块 ID |
| type | paragraph / heading / quote | 受控正文块类型 |
| text | string | 英文原文 |
| translationZh | string? | 与当前英文块一一对应的中文译文；不能替代 LearningUnit 的当前语境中文辅助 |

内置文章的每个正文块必须提供 translationZh。本地导入允许省略；一旦提供，导入校验必须保证英文块与中文块数量一致，且备份恢复时将该字段视为不可信文本一并校验。

### 4.2 ArticleProgress

每篇文章的个人阅读状态。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| articleId | string | 主键并关联 Article |
| status | unread / reading / completed | 阅读状态 |
| currentBlockId | string? | 最近稳定段落 |
| textAnchor | TextAnchor? | 可选的句内定位 |
| progressRatio | number | 0–1 的近似进度，仅用于展示 |
| startedAt | ISODate? | 首次开始 |
| lastReadAt | ISODate? | 最近阅读 |
| completedAt | ISODate? | 首次完成 |
| rereadCount | number | 完成后的重读次数 |
| totalActiveSeconds | number | 仅计算前台阅读的近似值 |
| reflectionText | string? | 完成文章后的个人回顾 |
| reflectionUpdatedAt | ISODate? | 回顾最近修改时间 |

scrollY 不能作为唯一位置依据，因为字体和视口改变后会失效。currentBlockId 是主锚点，progressRatio 是回退。

### 4.3 ExpressionConcept

跨语境表达及其核心概念。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 稳定主键 |
| canonicalForm | string | 规范形式，如 reflect 或 reflect on |
| expressionType | word / phrase / pattern | 学习单位类型 |
| language | en | 预留语言字段 |
| coreConcept | CoreConcept | 教学性核心概念 |
| conceptBranches | ConceptBranch[] | 必要时拆分的相关分支 |
| boundaries | string[] | 适用边界与常见误用 |
| contentVersion | number | 概念内容版本 |
| createdAt | ISODate | 创建时间 |
| updatedAt | ISODate | 最近更新 |

CoreConcept 建议包含：

- summaryEn：简明英文概念。
- supportZh：中文辅助模型，不是单词等号翻译。
- mentalModel：可选的中心意象/动态关系。
- authorNote：内容设计者的边界说明。

### 4.4 LearningUnit

把某篇文章中的预策划教学内容与表达概念相连。它是内容数据，不是用户记录。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| articleId | string | 所属文章 |
| blockId | string | 所在正文块 |
| expressionConceptId | string | 关联核心概念 |
| selectedText | string | 文中实际词形或短语 |
| textAnchor | TextAnchor | 精确位置 |
| sentenceText | string | 原句快照 |
| contextBefore | string? | 必要前文 |
| contextAfter | string? | 必要后文 |
| contextualMeaningEn | string | 当前语境英文理解 |
| contextualSupportZh | string | 中文辅助说明 |
| contextClues | Hint[] | 上下文线索 |
| grammarAndCollocations | Hint[] | 词性、结构与搭配 |
| simpleEnglishMeaning | string | 简单英文解释 |
| coreConnection | string | 当前用法如何连接核心概念 |
| relatedContextIds | string[] | 相关语境 |
| transferExerciseIds | string[] | 迁移练习 |
| contentVersion | number | 内容版本 |

### 4.5 Encounter

用户在真实阅读中遇见并选择探索某表达的不可变上下文记录。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID |
| articleId | string | 来源文章 |
| articleContentVersion | number | 当时文章版本 |
| blockId | string | 来源正文块 |
| expressionConceptId | string? | 已匹配概念；未知表达可为空 |
| learningUnitId | string? | 若命中预策划单元则关联 |
| selectedText | string | 用户实际选中的文本 |
| normalizedText | string | 保守规范化结果 |
| textAnchor | TextAnchor | 起止位置与校验文本 |
| sentenceText | string | 原句快照 |
| contextBefore | string? | 当时必要前文快照 |
| contextAfter | string? | 当时必要后文快照 |
| contextualMeaningEn | string? | 首次展开答案时保存的当前语境英文理解 |
| contextualSupportZh | string? | 当时的中文辅助说明 |
| coreConnection | string? | 当时的当前用法—核心概念连接说明 |
| conceptContentVersion | number? | 当时引用的核心概念内容版本 |
| encounteredAt | ISODate | 本次遇见时间 |
| source | planned / user_selected | 预策划或主动选择 |

即使文章或策划讲解日后更新，Encounter 中已形成的快照也不修改。答案性字段应在用户首次实际展开相应层级时写入，而不是点击表达时提前填充；这样既能还原历史学习内容，也不会让未查看的信息伪装成学习证据。

### 4.6 ExplorationSession

一次渐进式探索过程。相同 Encounter 可以多次探索。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID |
| encounterId | string | 关联具体语境 |
| startedAt | ISODate | 开始时间 |
| completedAt | ISODate? | 完成或离开时间 |
| guessText | string? | 用户第一步猜测 |
| guessRevisions | GuessRevision[] | 后续修订，保留时间与旧版本 |
| guessLanguage | en / zh / mixed / unknown | 可选标注 |
| revealedLevels | number[] | 实际展开过的层级 |
| highestRevealedLevel | number | 便于查询的摘要 |
| levelEvents | RevealEvent[] | 每层展开时间及停留信息 |
| selfAssessment | clearer / unsure / skipped? | 重读后的感受 |
| rereadAt | ISODate? | 回到原文重读的证据 |
| userNote | string? | 个人补充 |

不得只保存 highestRevealedLevel 而丢弃过程；后者是索引友好的摘要，levelEvents 才是原始证据。

### 4.7 RelatedContext

用于连接核心概念的其他真实语境。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| expressionConceptId | string | 关联概念 |
| branchId | string? | 所属概念分支 |
| sentenceText | string | 例句 |
| surroundingContext | string? | 必要背景 |
| contextualMeaningEn | string | 此处英文理解 |
| contextualSupportZh | string | 中文辅助 |
| coreConnection | string | 与核心概念的连接 |
| grammarNote | string? | 不可忽略的结构差异 |
| source | SourceInfo | 原创或来源信息 |

### 4.8 TransferExercise

内容侧的练习定义。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| expressionConceptId | string | 关联概念 |
| type | interpret / contrast / rewrite / produce | 练习类型 |
| prompt | string | 题面 |
| context | string? | 新语境 |
| choices | Choice[]? | 受控练习选项 |
| reference | ExerciseReference | 参考答案、理由与评分依据 |
| difficulty | intro / standard / stretch | 相对难度 |
| contentVersion | number | 内容版本 |

MVP 无服务端或 AI 评分。自由回答采用参考要点、自评与可选的结构化检查，不假装可以可靠自动评判所有自然语言。

### 4.9 PracticeAttempt

用户的一次练习证据。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID |
| exerciseId | string? | 预策划练习；临时练习可为空 |
| encounterId | string? | 来源语境 |
| expressionConceptId | string | 关联概念 |
| responseText | string? | 用户回答 |
| selectedChoiceId | string? | 选择题回答 |
| result | correct / partial / incorrect / self_rated / ungraded | 结果 |
| errorTags | ErrorTag[] | 错误类型 |
| hintDepth | number | 作答前使用的提示深度 |
| selfRating | number? | 用户自评 |
| attemptedAt | ISODate | 作答时间 |
| sourceContentVersion | number | 对应内容版本 |

用户造句也是 produce 类型的 PracticeAttempt，不再维护一份割裂的“造句收藏”。

### 4.10 LearningSummary

表达级别的可重建学习摘要。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| expressionConceptId | string | 主键 |
| firstEncounteredAt | ISODate? | 用户第一次真实遇见 |
| evidenceLevel | 0 / 1 / 2 / 3 / 4 | 学习模型中的证据等级 |
| contextRecognition | emerging / developing / stable | 当前语境维度 |
| conceptConnection | emerging / developing / stable | 概念连接维度 |
| transferUse | emerging / developing / stable | 迁移维度 |
| encounterCount | number | 遇见次数 |
| explorationCount | number | 探索次数 |
| latestEvidenceAt | ISODate? | 最近证据 |
| commonErrorTags | ErrorTag[] | 常见错误摘要 |
| computedAt | ISODate | 最近重算时间 |
| algorithmVersion | number | 摘要算法版本 |

它可以缓存以提升 Dashboard 性能，但必须能由 Encounter、ExplorationSession 与 PracticeAttempt 重建。

### 4.11 ReviewSchedule

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| expressionConceptId | string | 主键 |
| dueAt | ISODate? | 下次建议复习 |
| intervalDays | number? | 当前建议间隔 |
| reason | unresolved / context / concept / transfer / natural | 调度原因 |
| lastReviewedAt | ISODate? | 最近复习 |
| suspended | boolean | 用户主动暂停 |
| schedulerVersion | number | 调度规则版本 |

### 4.12 AppSettings

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | "singleton" | 单例主键 |
| theme | system / light / dark | 主题偏好 |
| textScale | number | 正文缩放 |
| lineHeight | number | 行高偏好 |
| reduceMotion | boolean | 减少动效 |
| pronunciationVoiceGb | string? | 当前设备上选定的英式系统声音 voiceURI |
| pronunciationVoiceUs | string? | 当前设备上选定的美式系统声音 voiceURI |
| pronunciationRate | number? | 系统发音语速，默认 0.96，限制在安全范围内 |
| dailyReadingMinutes | number | 温和的阅读目标 |
| lastBackupAt | ISODate? | 最近成功导出 |
| backupReminderDismissedAt | ISODate? | 备份提醒状态 |
| locale | string | 界面语言，MVP 可固定 zh-CN |

### 4.13 JournalEntry、DailyHabit 与 PlanItem

私人记录与英语学习证据分表保存，避免让私人日记被误解为学习笔记。

| 实体 | 主键 | 关键字段 |
| --- | --- | --- |
| JournalEntry | dateKey（本地 YYYY-MM-DD） | title、content、createdAt、updatedAt |
| DailyHabit | id | name、order、createdAt、archivedAt |
| HabitCompletion | habitId:dateKey | habitId、dateKey、completedAt |
| PlanItem | id | title、note、status、targetDate、createdAt、updatedAt、completedAt |

JournalEntry 只有在正文非空并成功保存后才存在，因此月历可以把“存在记录”作为日期填充依据。HabitCompletion 是独立证据，取消勾选时删除该日期的完成记录，不计算或保存惩罚性连胜。

### 4.14 ActivityEvent

仅用于本地学习回顾和产品指标计算，禁止远程上传。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID |
| type | string | article_opened、reread_returned 等受控枚举 |
| articleId | string? | 可选关联 |
| encounterId | string? | 可选关联 |
| occurredAt | ISODate | 时间 |
| payload | object | 经过白名单限制的小型结构 |

ActivityEvent 不记录每次滚动或按键，不保存输入框中尚未提交的敏感原文。

## 5. TextAnchor 设计

仅保存字符起止下标容易被内容更新破坏。建议 TextAnchor 同时包含：

- blockId。
- startOffset 与 endOffset。
- exact：被选中的原文。
- prefix 与 suffix：短的校验上下文。
- contentVersion。

读取时先按 blockId 和 offset 定位，再用 exact/prefix/suffix 校验。校验失败时保留历史快照，并将锚点标为 unresolved，不能静默关联到错误文本。

## 6. Dexie 表建议

MVP 的逻辑表：

| 表 | 主键 | 主要索引 |
| --- | --- | --- |
| articles | id | slug、updatedAt、*topicTags |
| articleProgress | articleId | status、lastReadAt、completedAt |
| expressionConcepts | id | canonicalForm、updatedAt |
| learningUnits | id | articleId、expressionConceptId、[articleId+blockId] |
| encounters | id | articleId、expressionConceptId、encounteredAt、[articleId+blockId] |
| explorationSessions | id | encounterId、startedAt、completedAt |
| relatedContexts | id | expressionConceptId |
| transferExercises | id | expressionConceptId、type |
| practiceAttempts | id | expressionConceptId、encounterId、attemptedAt |
| learningSummaries | expressionConceptId | evidenceLevel、latestEvidenceAt |
| reviewSchedules | expressionConceptId | dueAt、suspended |
| activityEvents | id | type、occurredAt、articleId |
| appSettings | id | — |
| contentPackages | id | version、installedAt |
| journalEntries | dateKey | updatedAt |
| habits | id | order、archivedAt |
| habitCompletions | id | habitId、dateKey、[habitId+dateKey] |
| plans | id | status、targetDate、updatedAt |

带星号的数组索引表示 multiEntry。最终索引以真实查询为依据，避免为了“可能有用”而增加写入成本。

## 7. 写入与事务边界

以下操作应使用事务：

- 首次探索：创建 Encounter、ExplorationSession，并创建或更新 LearningSummary.firstEncounteredAt。
- 完成练习：写入 PracticeAttempt，重算 LearningSummary，更新 ReviewSchedule。
- 安装内容包：写入 Article、LearningUnit、RelatedContext、TransferExercise 和 contentPackages 状态。
- 导入备份：完成所有校验后在单个恢复流程中写入；失败时保持原数据不变。

阅读滚动位置可以节流写入，不应每个 scroll event 都操作 IndexedDB。

## 8. 内容版本与迁移

### 8.1 数据库版本

- 每次 Dexie schema 变化提升数据库版本。
- 迁移函数应可测试、可重复理解，并保留旧字段到新字段的显式映射。
- 禁止通过删除数据库解决开发阶段的迁移问题，除非仅针对明确标识的测试库。

### 8.2 内容版本

- Article、LearningUnit、ExpressionConcept 均带 contentVersion。
- 小型文案修订可替换内容数据；历史 Encounter 继续使用快照。
- 改变表达范围、原句或核心概念分支的更新应创建迁移说明，必要时使用新 ID。
- 学习证据永远不因内容更新被自动判定为无效或掌握。

## 9. 导出格式

建议文件名：

Dedicated-to-Fx-backup-YYYY-MM-DD.json

顶层结构：

~~~json
{
  "format": "dedicated-to-fx-backup",
  "schemaVersion": 2,
  "appVersion": "future-build-version",
  "exportedAt": "ISO-8601 timestamp",
  "data": {
    "user": {},
    "contentReferences": {},
    "optionalContentSnapshots": {}
  }
}
~~~

### 必须导出

- 所有用户数据表。
- 用户记录引用到的内容 ID 与版本。
- 无法从当前内容包可靠恢复的必要上下文快照。
- 历史记录依赖的当前语境解释、核心概念版本和连接说明快照。
- 设置和最近备份元信息。
- 全部私人日记、每日习惯、习惯完成记录与计划。
- Fx 本地导入的文章正文与元数据；内置文章无需重复导出。

### 可以省略

- Service Worker 缓存。
- 可重新安装且未被历史记录引用的文章内容。
- 可从原始证据重建的统计缓存；若导出则导入后重新计算。

### 导入策略

MVP 明确提供两种模式：

1. **替换恢复**：校验成功后，用备份恢复用户数据。
2. **安全合并**：按稳定 ID 合并；冲突记录均保留并生成新 ID/映射，不能按“更新时间较新”静默覆盖学习证据。

实现安全合并成本较高时，首个可用版本可以只提供替换恢复，但必须在 UI 中说清楚。

## 10. 数据删除

- 删除一篇已下载文章时，默认只移除可重新获取的正文缓存，不删除 Encounter 和学习记录快照。
- 删除某个学习记录需要展示影响范围。
- 删除单条 Encounter 时，在同一事务中删除其 ExplorationSession 与 PracticeAttempt；若关联 ExpressionConcept，则从剩余 Encounter、Session 和 Attempt 重建 LearningSummary，没有剩余遇见时删除该摘要。
- “清除全部数据”是破坏性操作，必须二次确认，并在执行前主动建议导出。
- 不实现自动过期删除学习记录。

## 11. 隐私与完整性

- IndexedDB 中不保存密码、Token 或 API Key。
- 访问密码不进入任何业务表，也不写入浏览器存储；`localStorage` 只保存与当前公开校验配置对应的本机授权标记。
- 正式密码只在本机临时用于派生 PBKDF2-SHA-256 校验值；GitHub Actions 只保存派生值和随机盐。
- 导入 JSON 使用白名单 schema 校验，限制文件体积和嵌套深度。
- 文章正文作为文本/受控块渲染，不直接信任导入 HTML。
- 所有时间保存为 UTC ISO 字符串，展示时转换为本地时区。
- 本地数据不是永久安全存储；产品必须持续提醒备份而不是给出错误承诺。

## 12. 需要在开发前确认的决策

1. MVP 导入是否仅支持“替换恢复”，还是同时实现安全合并。
2. 未命中预策划内容的用户自选表达：只保存待补充记录，还是提供有限的手工笔记能力。
3. 文章正文是否全部随安装包提供，还是采用可选静态内容包。
4. ExpressionConcept 的内容更新是否保留多版本快照，还是仅由 Encounter 保存必要历史。
5. 第一批内容的稳定 ID 和许可元数据由何种内容工作流生成。

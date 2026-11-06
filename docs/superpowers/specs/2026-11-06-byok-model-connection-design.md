# BYOK 模型连接设计

## 目标

让本草同时支持 POPO 演示模式和用户自带 API（BYOK）模式，避免公开访问时所有模型请求都消耗作品作者的额度。

## 方案

页面默认使用 POPO PopSDK。用户打开“模型连接”设置，填写 Base URL、API Key、模型名称和接口协议后，配置只保存在当前页面内存中；后续请求直接从浏览器发送到用户填写的服务端。刷新页面、关闭页面或点击清除后，Key 消失。

支持两种 OpenAI 兼容协议：

- Responses：POST `/v1/responses`，请求体使用 `input`
- Chat Completions：POST `/v1/chat/completions`，请求体使用 `messages`

Base URL 只允许 HTTPS；本机调试允许 localhost/127.0.0.1。页面不把 Key 写入 URL、localStorage、sessionStorage、历史记录、埋点或错误信息。接口需要允许发布页面的 CORS 请求，否则页面显示可理解的连接失败提示。

## 交互

新增“模型连接”入口，显示当前状态：POPO 演示模式或本页自有 API。设置弹窗提供协议、Base URL、Key、模型名称、测试连接、保存、清除。保存时仅验证格式，不自动发起模型请求；下一次真实提问才请求。提示用户：Key 仅在当前页面内存使用，接口必须支持浏览器跨域，页面代码可以读取用户填写的 Key，因此只使用自己信任的站点。

## 代码边界

新增 `public/model.mjs`，负责配置生命周期、URL 规范化、POPO/BYOK 请求选择和错误分类。修改 `public/app.js` 使用统一请求入口；扩展 `public/core.mjs` 的响应读取，兼容 Responses 非流式和 SSE 的 `response.output_text.delta`。不改变现有安全分流、RAG 校验、历史保存和健康数据结构。

## 验证

增加单元测试覆盖 URL 规范化、配置不持久化、请求协议选择、Responses 非流式响应解析和 Responses SSE 增量解析。运行完整 Node 测试、构建、RAG/红队评估；浏览器中验证默认 POPO、BYOK 保存/清除和错误提示。

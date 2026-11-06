import { MODEL as DEFAULT_MODEL } from './config.js';
import { readCompletion } from './core.mjs';

const ROUTES = { responses: 'responses', chat: 'chat/completions' };
let config = null;

function cleanBaseUrl(value) {
  const raw = String(value || '').trim();
  let url;
  try { url = new URL(raw); } catch { throw new Error('Base URL 格式不正确'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('Base URL 必须使用 HTTPS');
  if (url.username || url.password || url.search || url.hash) throw new Error('Base URL 不能包含账号、参数或片段');
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/(?:responses|chat\/completions)$/, '');
  return url.toString().replace(/\/$/, '');
}

export function normalizeConfig(input = {}) {
  const protocol = input.protocol || 'responses';
  if (!Object.hasOwn(ROUTES, protocol)) throw new Error('请选择支持的接口协议');
  const baseUrl = cleanBaseUrl(input.baseUrl);
  const apiKey = String(input.apiKey || '').trim();
  const model = String(input.model || '').trim();
  if (!apiKey) throw new Error('请填写 API Key');
  if (/[\s\x00-\x1f\x7f]/.test(apiKey) || apiKey.length > 4096) throw new Error('API Key 格式不正确');
  if (apiKey.length < 8) throw new Error('API Key 太短，请检查后再试');
  if (!model || model.length > 200 || /[\r\n]/.test(model)) throw new Error('请填写有效的模型名称');
  return { protocol, baseUrl, apiKey, model };
}

export function endpointFor(value) {
  const current = value?.baseUrl ? value : normalizeConfig(value);
  const path = new URL(current.baseUrl).pathname.replace(/\/+$/, '');
  const prefix = path.endsWith('/v1') ? path : `${path}/v1`;
  return `${new URL(current.baseUrl).origin}${prefix}/${ROUTES[current.protocol]}`;
}

export function setModelConfig(input) {
  const next = normalizeConfig(input);
  config = next;
  return getModelConfig();
}

export function clearModelConfig() { config = null; }

export function getModelConfig() {
  if (!config) return null;
  return { mode:'byok', protocol:config.protocol, baseUrl:config.baseUrl, model:config.model, hasKey:true };
}

export function modelMode() { return config ? 'byok' : 'popo'; }
export function modelStatus() {
  return config ? { mode:'byok', label:'本页自有 API', model:config.model, protocol:config.protocol } : { mode:'popo', label:'POPO 演示模式', model:DEFAULT_MODEL, protocol:'chat' };
}

async function directRequest(candidate, payload, { signal } = {}) {
  const body = candidate.protocol === 'responses' ? { model:candidate.model, input:payload.messages, store:false, stream:Boolean(payload.stream), ...(payload.max_tokens !== undefined ? {max_output_tokens:payload.max_tokens} : {}), ...(payload.temperature !== undefined ? {temperature:payload.temperature} : {}) } : { ...payload, model:candidate.model };
  let response;
  try {
    response = await fetch(endpointFor(candidate), { method:'POST', headers:{ Authorization:`Bearer ${candidate.apiKey}`, 'Content-Type':'application/json' }, body:JSON.stringify(body), signal, redirect:'error', credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store' });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw Object.assign(new Error('BYOK_NETWORK_ERROR'), { code:'BYOK_NETWORK_ERROR' });
  }
  if (!response.ok) throw Object.assign(new Error('BYOK_HTTP_ERROR'), { code:'BYOK_HTTP_ERROR', status:response.status });
  return response;
}

export async function testModelConfig(input, options = {}) {
  const candidate = normalizeConfig(input);
  const response = await directRequest(candidate, { model:candidate.model, messages:[{role:'user',content:'请只回复：连接成功'}], stream:false }, options);
  await readCompletion(response, () => {});
  return true;
}

export async function requestModel(payload, { signal } = {}) {
  if (!config) {
    if (!globalThis.window?.PopSDK?.model?.request) throw Object.assign(new Error('SDK_UNAVAILABLE'), { code:'SDK_UNAVAILABLE' });
    return globalThis.window.PopSDK.model.request(payload, { path:'/v1/chat/completions', signal });
  }
  return directRequest(config, payload, { signal });
}

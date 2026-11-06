import { requestModel, testModelConfig, setModelConfig, clearModelConfig, getModelConfig, modelStatus } from './model.mjs';
import { buildMessages, splitAnswer, readCompletion, friendlyError, quickTestPrompt, buildVisitSummary, turnPrompt, userDescription, routeTurn } from './core.mjs';
import {SOURCES,TOPICS,CHECKIN_QUESTIONS,allQuestions,questionsFor,confirmedFacts,detectTopic,normalizeCareData,careRows,careTriage,sourceIdsFor,citedSources,cleanPreferences,localDate,answerWithSources,canConfirmCare,evidenceFor,preferenceRecord,activePreferences,recentTurn} from './care.mjs';
import { loadHistory, saveSession, deleteSession,clearLocalData,dataEpoch,EPOCH_KEY,saveLocalPreference,loadLocalPreference } from './history.mjs';
import {resolveContext,assessInput,responseRisk,nextActions,URGENT_ANSWER,routeInput} from './policy.mjs';

import {retrieve,validateBundle,validateResponse,formatGrounded,evidenceSnapshot,ABSTAIN,KNOWLEDGE_VERSION} from './rag.mjs';
import {readMetrics,setMetricsConsent,recordMetric} from './metrics.mjs';
import {imageQuality} from './image.mjs';
let knowledgePromise=null;
function loadKnowledge(signal) {
  if(!knowledgePromise)knowledgePromise=fetch('./knowledge/index.json',{signal}).then(r=>{if(!r.ok)throw new Error('KNOWLEDGE_UNAVAILABLE');return r.json();}).then(b=>{validateBundle(b);return b;}).catch(e=>{knowledgePromise=null;throw e;});
  return knowledgePromise;
}
const $ = selector => document.querySelector(selector);
const form = $('#chat-form'), input = $('#question'), send = $('#send');
const welcome = $('#welcome'), conversation = $('#conversation');
const turns = [];
let active = null, toastTimer;
let modelTestController=null;
let currentSession = null, historySessions = [], saveTimer, saveFailed = false, pendingDeleteId = null;
const NAV_KEY = 'bencao.navigation.v1';
let quickTestState = null, careState=null;
const PREF_KEY='bencao.preferences.v1';
let storageEpoch='';try{storageEpoch=dataEpoch(localStorage);}catch{/* Storage warning is shown by refreshHistory. */}
const quickQuestions = [
  { question: '现在最困扰你的是什么？', note: '先选一个最接近的，不需要想得很准确。', options: ['疲惫、没精神', '睡不好、容易醒', '胃口或消化不舒服', '其他，说不清楚'] },
  { question: '这种情况大概多久了？', note: '时间有助于判断是先观察，还是尽快评估。', options: ['刚出现，几天内', '大约 1—2 周', '2 周到 1 个月', '超过 1 个月', '反复出现'] },
  { question: '你希望先从哪一步开始？', note: '你可以选择最想得到的帮助。', options: ['先了解日常调理', '判断是否需要就医', '了解中医通常怎么看', '我还不确定'] }
];

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`); svg.setAttribute('aria-hidden','true'); svg.append(use); return svg;
}
// Model content becomes text nodes only; HTML and arbitrary links are never executed.
function inline(target, text, sourceIds=[]) {
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[来源:[\w-]+\])/g)) {
    if (part.startsWith('[来源:')) {
      const id=part.slice(4,-1);const source=sourceIds.includes(id)?SOURCES.find(s=>s.id===id):null;
      if(source) {const link=sourceLink(source,`[${sourceIds.indexOf(id)+1}]`);link.className='citation';link.title=source.title;link.setAttribute('aria-label',`查看依据：${source.title}`);target.append(link);} else target.append(document.createTextNode('（出处未核实）'));
    } else if (part.startsWith('**') && part.endsWith('**')) target.append(element('strong', '', part.slice(2, -2)));
    else if (part.startsWith('`') && part.endsWith('`')) target.append(element('code', '', part.slice(1, -1)));
    else target.append(document.createTextNode(part));
  }
}
function renderMarkdown(target, text, sourceIds=[]) {
  const fragment = document.createDocumentFragment();
  let paragraph = [], list = null;
  function flush() { if (paragraph.length) { const p = element('p'); inline(p, paragraph.join('\n'),sourceIds); fragment.append(p); paragraph = []; } list = null; }
  for (const line of text.split('\n')) {
    if (!line.trim()) { flush(); continue; }
    if (/^#{1,6}\s/.test(line)) { flush(); const h = element('h3'); inline(h, line.replace(/^#{1,6}\s+/, ''),sourceIds); fragment.append(h); }
    else if (/^(?:[-*]|\d+[.)、])\s+/.test(line)) {
      if (paragraph.length) flush();
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.tagName.toLowerCase() !== tag) { list = element(tag); fragment.append(list); }
      const li = element('li'); inline(li, line.replace(/^(?:[-*]|\d+[.)、])\s+/, ''),sourceIds); list.append(li);
    } else { if (list) list = null; paragraph.push(line); }
  }
  flush(); target.replaceChildren(fragment);
}
function notify(text) { $('#announcement').textContent = text; }
function toast(text) { const box = $('#toast'); box.textContent = text; box.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => box.hidden = true, 2200); }
function storageWarning(message) { $('#save-warning').textContent=message; $('#save-warning').hidden=!message; }
function rememberView(view) {
  try { sessionStorage.setItem(NAV_KEY,JSON.stringify({id:currentSession?.id || null,view})); } catch { /* History still works if tab navigation cannot be remembered. */ }
}
function updateSessionHeading() {
  $('#conversation-title').textContent=currentSession?.title || '与本草的对话';
  $('#resume-chat').hidden=!currentSession;
  $('#saved-state').textContent=saveFailed ? '保存失败 · 请先导出' : '自动保存在此浏览器';
}
function renderHistory() {
  for (const list of document.querySelectorAll('.history-list')) {
    list.replaceChildren();
    if (!historySessions.length) list.append(element('p','history-empty','聊过的问题会留在这里。'));
    for (const session of historySessions) {
      const row=element('div',`history-row${session.id===currentSession?.id?' selected':''}`);
      const open=element('button','history-open'); open.type='button'; open.disabled=!!active;
      open.setAttribute('aria-label',`继续对话：${session.title}`);
      if (session.id===currentSession?.id) open.setAttribute('aria-current','true');
      open.append(element('strong','',session.title),element('small','',new Date(session.updatedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})));
      open.addEventListener('click',()=>openSession(session.id));
      const remove=element('button','history-delete','×'); remove.type='button'; remove.disabled=!!active;
      remove.setAttribute('aria-label',`删除对话：${session.title}`);
      remove.addEventListener('click',()=>{pendingDeleteId=session.id;$('#delete-session-title').textContent=session.title;$('#delete-session').showModal();});
      row.append(open,remove); list.append(row);
    }
  }
  updateSessionHeading();
}
function refreshHistory() {
  try {
    const loaded=loadHistory(localStorage); historySessions=loaded.sessions;
    if (loaded.unreadable) storageWarning('部分旧记录无法读取，原始记录未删除，请勿清除浏览器数据。');
  } catch { storageWarning('浏览器暂时无法读取历史。当前对话仍可继续，请及时导出。'); }
  renderHistory();
}
function persistSession() {
  clearTimeout(saveTimer); saveTimer=null;
  if (!currentSession || !turns.some(t=>!t.example)) return true;
  currentSession.turns=turns;
  try {
    try { saveSession(localStorage,currentSession,storageEpoch); }
    catch (error) {
      if (error.message!=='HISTORY_CONFLICT') throw error;
      currentSession={...currentSession,id:crypto.randomUUID(),title:`${currentSession.title}（另存）`,revision:0};
      saveSession(localStorage,currentSession,storageEpoch);
      toast('其他标签页已更新，当前内容已单独保存');
    }
    historySessions=[currentSession,...historySessions.filter(s=>s.id!==currentSession.id)].sort((a,b)=>b.updatedAt-a.updatedAt);
    saveFailed=false; storageWarning(''); rememberView(welcome.hidden?'chat':'home'); updateSessionHeading(); return true;
  } catch (error) {
    if(error.message==='DATA_CLEARED') {forgetInMemory();toast('本机数据已在其他标签页清除');return false;}
    saveFailed=true; updateSessionHeading();
    storageWarning('本机保存失败，可能是空间不足或浏览器限制。请先导出对话，避免刷新后丢失。');
    return false;
  }
}
function saveTurnProgress(immediately=false) {
  if (!currentSession) {
    const first=turns.find(t=>!t.example); if (!first) return;
    const title=first.quickAnswers ? `快测 · ${first.quickAnswers[0]?.answer || '健康梳理'}` : first.user;
    currentSession={id:crypto.randomUUID(),title:title.replace(/\s+/g,' ').slice(0,32),createdAt:Date.now(),updatedAt:Date.now(),revision:0,turns};
  }
  currentSession.updatedAt=Date.now();
  if (immediately) { persistSession(); renderHistory(); }
  else if (!saveTimer) saveTimer=setTimeout(persistSession,400);
}
function mayNavigate() {
  if (active) { toast('请先停止当前回答，再切换对话'); return false; }
  if (!persistSession()) { toast('请先导出当前对话，再尝试切换'); return false; }
  return true;
}
function goHome() {
  if (!mayNavigate()) return;
  welcome.hidden=false; conversation.hidden=true; $('#conversation-bar').hidden=true;
  document.body.classList.remove('in-chat'); input.value=''; resizeInput(); rememberView('home'); renderHistory();
  window.scrollTo({top:0,behavior:'instant'});
}
function newConversation() {
  if (!mayNavigate()) return false;
  currentSession=null; resetConversation(); rememberView('home'); renderHistory(); return true;
}
function openSession(id) {
  if (!mayNavigate()) return;
  let session;
  try { session=loadHistory(localStorage).sessions.find(s=>s.id===id); }
  catch { storageWarning('暂时无法读取这段历史，请稍后重试。'); return; }
  if (!session) { refreshHistory(); toast('这段对话已不存在'); return; }
  clearTimeout(saveTimer); currentSession=session; turns.length=0; conversation.replaceChildren();
  for (const saved of session.turns) {
    const turn=createTurn(saved.user,false,{quickAnswers:saved.quickAnswers,careData:saved.careData,sourceIds:saved.sourceIds,context:saved.context,createdAt:saved.createdAt,risk:saved.risk,rag:saved.rag,evidence:saved.evidence});
    turn.answer=saved.answer; turn.status=saved.status;
    if (turn.status==='error') showError(turn,new Error('RESTORED_ERROR'));
    else renderMarkdown(turn.answerEl,splitAnswer(turn.answer).text || '上次回答尚未完成，可以重新生成。',turn.sourceIds);
    renderActions(turn); renderFollowups(turn); renderResultSteps(turn); renderEvidence(turn); renderRiskNote(turn);
  }
  // Actions for a stopped turn depend on which turn is last.
  turns.forEach(renderActions); turns.forEach(renderResultSteps); turns.forEach(renderEvidence);
  $('#history-dialog').close(); showConversation(); rememberView('chat'); refreshHistory(); scrollLatest();
}
function exportHistory() {
  let sessions=historySessions;
  try { sessions=loadHistory(localStorage).sessions; } catch { /* Export available in-memory data if storage is blocked. */ }
  if (currentSession) sessions=[...sessions.filter(s=>s.id!==currentSession.id),{...currentSession,turns}];
  const clean=sessions.map(s=>({title:s.title,createdAt:new Date(s.createdAt).toISOString(),updatedAt:new Date(s.updatedAt).toISOString(),
    turns:s.turns.filter(t=>!t.example).map(t=>({question:t.user,answer:turnText(t),status:t.status,quickAnswers:t.quickAnswers || null,careData:t.careData || null,context:t.context || null,risk:t.risk || null,createdAt:t.createdAt,rag:t.rag || null,evidence:t.rag?t.evidence:evidenceFor(t.answer,t.sourceIds),references:citedSources(t.answer,t.sourceIds).map(({title,url,publisher,date,scope})=>({title,url,publisher,date,scope}))}))}));
  const url=URL.createObjectURL(new Blob([JSON.stringify({name:'本草对话备份',preferences:readPreferenceRecord(),conversations:clean},null,2)],{type:'application/json'}));
  const link=element('a'); link.href=url; link.download=`本草对话-${new Date().toISOString().slice(0,10)}.json`; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resizeInput() {
  input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
  send.disabled = !active && !input.value.trim();
  $('#char-count').hidden = input.value.length < 1500;
  $('#char-count').textContent = `${input.value.length}/2000`;
}
function updateBusy() {
  send.classList.toggle('stop', !!active);
  send.setAttribute('aria-label', active ? '停止生成' : '发送问题');
  send.title = active ? '停止生成' : '发送问题';
  document.querySelectorAll('[data-question], .followups button, .history-open, .history-delete, .next-card, #quick-test-start').forEach(button => button.disabled = !!active);
  conversation.setAttribute('aria-busy', String(!!active));
  resizeInput();
}
function showConversation() { welcome.hidden = true; conversation.hidden = false; $('#conversation-bar').hidden=false; document.body.classList.add('in-chat'); updateSessionHeading(); }
function scrollLatest() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); }
function nearBottom() { return document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 160; }
function createTurn(user, example = false, meta = {}) {
  showConversation();
  const previous=turns.filter(t=>!t.example).at(-1);
  const prior=previous && recentTurn(previous)?previous.context:previous?.context?.population?{intent:'unknown',topic:'general',population:previous.context.population}:null;
  const context=meta.context || resolveContext({user,...meta},prior);
  const turn = {user, answer:'', status:'pending', example,createdAt:meta.createdAt ?? Date.now(),risk:meta.risk || 'general',rag:meta.rag || null,evidence:meta.evidence || []};
  const root = element('article', `turn${example ? ' example' : ''}`);
  const userRow = element('div','user-row'); userRow.append(element('div','user-bubble',user));
  const quickSummary = meta.quickAnswers ? createQuickSummary(meta.quickAnswers) : null;
  const head = element('div','assistant-head');
  const logo = element('span','brand-icon'); logo.append(icon('leaf'));
  head.append(logo, element('span','','本草'), element('small','',example?'示例回答':'中医健康助手'));
  const answer = element('div','answer'), actions = element('div','answer-actions'), followups = element('div','followups');
  const next = element('div','result-next');const evidence=element('div','evidence');const riskNote=element('div','risk-note');
  root.append(userRow); if (quickSummary) root.append(quickSummary); if(meta.careData) root.append(careSummary(meta.careData)); root.append(head,riskNote,answer,actions,evidence,followups,next); conversation.append(root);
  Object.assign(turn,{root,context,riskNoteEl:riskNote,answerEl:answer,actions,followupEl:followups,nextEl:next,evidenceEl:evidence,careData:meta.careData || null,sourceIds:meta.sourceIds || [],quickAnswers:meta.quickAnswers || null}); turns.push(turn); turns.forEach(renderResultSteps);turns.forEach(renderFollowups); return turn;
}
function createQuickSummary(answers) {
  const card = element('div','quick-summary');
  const head = element('div','quick-summary-head'); head.append(element('strong','','快测信息'), element('small','',`${answers.length} 个回答`));
  const pills = element('div','quick-summary-pills');
  answers.forEach(({answer}) => pills.append(element('span','',answer)));
  card.append(head,pills); return card;
}
function showThinking(turn) {
  const thinking = element('div','thinking'); thinking.append(element('i'),element('i'),element('i'),element('span','','正在梳理你的问题…')); turn.answerEl.replaceChildren(thinking);
}
function renderFollowups(turn) {
  turn.followupEl.replaceChildren();
  if (turn!==turns.at(-1) || turn.status !== 'done' || turn.example || riskFor(turn)!=='general' || !(['knowledge','unknown'].includes(turn.context.intent) || turn.context.topic==='movement')) return;
  for (const question of splitAnswer(turn.answer).followups.slice(0,2)) {
    const button = element('button','',`${question}  ↗`); button.type='button'; button.disabled=!!active;
    button.addEventListener('click', () => submit(question)); turn.followupEl.append(button);
  }
}
function turnText(turn) {
  if(!turn.rag)return answerWithSources(turn.answer,turn.sourceIds);
  return splitAnswer(turn.answer).text+(turn.evidence?.length?'\n\n对应资料（机器匹配，尚未完成人工医学复核）\n'+turn.evidence.map(e=>`${e.statement}\n${e.source.title} · ${e.source.url}\n支持范围：${e.scope}\n局限：${e.uncertainty}\n核对：${e.checkedAt || e.source.checkedAt}`).join('\n\n'):'');
}
function metric(event) {try{recordMetric(localStorage,event,storageEpoch);}catch{/* Optional metrics. */}}
function renderActions(turn) {
  turn.actions.replaceChildren();
  if (turn.answer) {
    const copy = element('button','','复制'); copy.type='button'; copy.prepend(icon('copy'));
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(turnText(turn)); toast('回答已复制'); }
      catch { toast('暂时无法复制，可长按选择回答文字'); }
    }); turn.actions.append(copy);
  }
  if(turn.status==='done' && !turn.example) {
    const correction=element('button','','信息不符合');correction.type='button';
    correction.addEventListener('click',()=>{metric('corrections');input.value='我想更正一下：';resizeInput();input.focus();toast('请说明哪里不符合，本草会重新核对');});turn.actions.append(correction);
  }
  if (turn.status === 'stopped') {
    turn.actions.append(element('span','status-label','已中断 · 内容尚未完成'));
    if (turn===turns.at(-1)) {
      const retry=element('button','','重新生成'); retry.type='button';
      retry.addEventListener('click',()=>run(turn)); turn.actions.append(retry);
    }
  }
}
function openVisitSummary() {$('#visit-summary-text').value=buildVisitSummary(turns);$('#visit-summary-status').textContent='';$('#visit-summary').showModal();}
function renderResultSteps(turn) {
  turn.nextEl.replaceChildren();
  if(turn!==turns.at(-1) || turn.status!=='done' || turn.example) return;
  const topic=topicFor(turn),risk=riskFor(turn);
  const complete=Object.keys(confirmedFacts(turns,topic)).length>=3;
  const actions=nextActions(turn.context,risk,complete,turn.rag?.status);
  if(!actions.length) return;
  const grid=element('div','next-grid');
  const defs={
    summary:['整理就医信息','核对后可带给医生；不要因此延误求助',openVisitSummary],
    intake:[`补充${TOPICS[topic] || '身体'}情况`,'选填关键信息，可随时退出',()=>openCare(Object.hasOwn(TOPICS,topic)?topic:'general')],
    guide:['今天先做一件小事','查看睡眠日常活动与放松建议',renderSleepGuide],
    checkin:['记录今日感受','愿意时再记录，没有打卡任务',()=>openCare(topic,'checkin')]
  };
  actions.forEach((action,i)=>{const card=resultCard(...defs[action]);card.classList.add(i?'secondary-cta':'primary-cta');grid.append(card);});
  turn.nextEl.append(element('strong','','接下来'),grid);
}

function showError(turn, error) {
  const box = element('div','error-card',friendlyError(error)); box.setAttribute('role','alert');
  if(error?.code==='BYOK_NOT_CONFIGURED' || String(error?.code || '').startsWith('BYOK_')) {const configure=element('button','','配置模型连接');configure.type='button';configure.addEventListener('click',openModelSettings);box.append(configure);}
  const retry = element('button','','重新尝试'); retry.type='button'; retry.addEventListener('click', () => {
    if (active) return;
    // Retry only the latest turn so the request uses the correct preceding context.
    if (turn !== turns.at(-1)) { input.value=userDescription(turn);toast('已把原记录放回输入框，请核对后发送'); resizeInput(); input.focus(); return; }
    run(turn);
  }); box.append(retry);
  if (turn.answer) { renderMarkdown(turn.answerEl,splitAnswer(turn.answer).text,turn.sourceIds); turn.answerEl.append(box); }
  else turn.answerEl.replaceChildren(box);
  notify('回答未完成，可以重试。');
}
function retrievalQuery(turn) {
  const current=riskInput(turn);
  const contextual=turn.careData?`${TOPICS[turn.careData.topic] || ''}，${current}`:current;
  if(!turn.context.continuation || turn.careData?.replace)return contextual;
  let previous=turns.slice(0,turns.indexOf(turn)).filter(t=>!t.example && recentTurn(t));
  const boundary=previous.findLastIndex(t=>t.context?.continuation===false || t.careData?.replace);if(boundary>=0)previous=previous.slice(boundary);
  return [...previous.filter(t=>t.context?.topic===turn.context.topic).slice(-2).map(riskInput),contextual].join('，').slice(-2400);
}
function finishLocal(turn,text,risk,status,reason) {
  turn.risk=risk;turn.rag={...turn.rag,status,reason};turn.evidence=[];
  turn.answer=text+'\n\n<<FOLLOWUPS>>[]\n<<CARE>>'+JSON.stringify({...turn.context,urgent:risk==='urgent'});
  turn.status='done';renderMarkdown(turn.answerEl,splitAnswer(turn.answer).text);notify(risk==='urgent'?'请优先寻求紧急帮助':'回答已完成');
}
async function run(turn) {
  if (active || !ensureEpoch()) return;
  const modelInput=turnPrompt(turn);
  const preferences=$('#use-preferences').checked?activePreferences(readPreferenceRecord(),turn.context):null;
  const previous=turns.slice(0,turns.indexOf(turn)).filter(t=>!t.example).at(-1);
  const gate=routeTurn(turn,previous,preferences);turn.context.population=gate.population;
  turn.sourceIds=[];turn.evidence=[];turn.risk=gate.risk;turn.rag={version:KNOWLEDGE_VERSION,status:'pending',retrievedIds:[],claimIds:[],reason:gate.reason};
  turn.answer='';turn.status='pending';turn.actions.replaceChildren();turn.followupEl.replaceChildren();turn.nextEl.replaceChildren();turn.evidenceEl.replaceChildren();showThinking(turn);renderRiskNote(turn,true);
  const request={controller:new AbortController(),stopped:false,timedOut:false};
  active=request;saveTurnProgress(true);updateBusy();notify('本草正在核对相关资料');scrollLatest();metric('queries');
  const timeout=setTimeout(()=>{request.timedOut=true;request.controller.abort();},90000);
  try {
    if(gate.route!=='retrieve') {metric('riskBlocks');finishLocal(turn,gate.answer,gate.risk,'blocked',gate.reason);return;}
    if(!getModelConfig()) throw Object.assign(new Error('BYOK_NOT_CONFIGURED'),{code:'BYOK_NOT_CONFIGURED'});
    let bundle;
    try {bundle=await loadKnowledge(request.controller.signal);}catch(error){if(request.controller.signal.aborted || request.cleared)throw error;metric('abstentions');finishLocal(turn,'这次暂时无法读取核对资料。'+ABSTAIN,'consult','abstained','knowledge-unavailable');return;}
    if(request.controller.signal.aborted || request.cleared)throw new DOMException('Aborted','AbortError');
    metric('retrievalAttempts');
    const retrieval=retrieve(retrievalQuery(turn),turn.context,bundle);
    turn.rag.retrievedIds=retrieval.cards.map(c=>c.id);
    if(!retrieval.cards.length) {metric('abstentions');finishLocal(turn,ABSTAIN,'consult','abstained',retrieval.reason);return;}
    metric('retrievalHits');
    showThinking(turn);turn.answerEl.querySelector('.thinking span').textContent='已找到相关资料，正在核对回答…';
    const response=await requestModel({messages:buildMessages(turns.slice(0,turns.indexOf(turn)),modelInput,{retrieval,preferences,currentCareData:turn.careData,context:turn.context}),stream:true,max_tokens:1400,temperature:0.2},{signal:request.controller.signal});
    if(request.controller.signal.aborted || request.cleared)throw new DOMException('Aborted','AbortError');
    // Never render or persist unvalidated model prose, including streaming fragments.
    const raw=await readCompletion(response,()=>{if(request.controller.signal.aborted || request.cleared)throw new DOMException('Aborted','AbortError');});
    const checked=validateResponse(raw,retrieval);
    if(checked.status==='urgent') {metric('riskBlocks');finishLocal(turn,URGENT_ANSWER,'urgent','blocked','model-urgent');return;}
    if(checked.status!=='verified') {metric('abstentions');finishLocal(turn,ABSTAIN,'consult','abstained',checked.reason);return;}
    turn.risk='general';turn.rag={...turn.rag,status:'verified',reason:checked.reason,claimIds:checked.claims.map(c=>c.id)};turn.evidence=evidenceSnapshot(checked,retrieval);
    turn.answer=formatGrounded(checked,turn.context)+'\n\n<<FOLLOWUPS>>[]\n<<CARE>>'+JSON.stringify({...turn.context,urgent:false});
    turn.status='done';renderMarkdown(turn.answerEl,splitAnswer(turn.answer).text);metric('groundedAnswers');notify('回答与资料已对应');
  }catch(error) {
    if(request.cleared)return;
    if(request.stopped){turn.status='stopped';turn.rag.status='stopped';turn.answerEl.replaceChildren(element('p','','已停止整理。问题已保存，尚未展示未核对的内容。'));notify('已停止生成');}
    else {request.needsConfig=error.code==='BYOK_NOT_CONFIGURED';turn.status='error';turn.rag.status='abstained';turn.risk='consult';metric('modelFailures');showError(turn,request.timedOut?new Error('TIMEOUT'):error);}
  }finally {
    clearTimeout(timeout);if(active===request)active=null;if(request.cleared)return;
    saveTurnProgress(true);updateBusy();renderActions(turn);renderFollowups(turn);renderResultSteps(turn);renderEvidence(turn);renderRiskNote(turn);
    if(request.needsConfig) openModelSettings();
  }
}

function submit(text) {
  if (active || !text.trim()) return;
  const value=text.trim().slice(0,2000);
  if ((!welcome.hidden || turns.some(t=>t.example)) && !newConversation()) return;
  input.value=''; resizeInput();
  run(createTurn(value));
}
function renderQuickQuestion() {
  const current = quickQuestions[quickTestState.index];
  $('#quick-progress').textContent = `${quickTestState.index + 1} / ${quickQuestions.length}`;
  $('#quick-question-title').textContent = current.question;
  $('#quick-question-note').textContent = current.note;
  $('#quick-back').hidden = quickTestState.index === 0;
  const options = $('#quick-options'); options.replaceChildren();
  options.setAttribute('role','radiogroup');options.setAttribute('aria-labelledby','quick-question-title');
  current.options.forEach(answer=>{const label=element('label','quick-option radio-option');const radio=element('input');radio.type='radio';radio.name='quick-choice';radio.value=answer;label.append(radio,document.createTextNode(answer));options.append(label);});
  const next=element('button','dialog-confirm','下一步');next.type='button';next.addEventListener('click',()=>{
    const selected=options.querySelector('input:checked');if(!selected){toast('先选一项，或直接返回提问');return;}
    quickTestState.answers.push({question:current.question,answer:selected.value});
    if(quickTestState.index<quickQuestions.length-1){quickTestState.index++;renderQuickQuestion();}else finishQuickTest();
  });options.append(next);options.querySelector('input')?.focus();
}
function startQuickTest() {
  if (active) return;
  quickTestState = {index:0,answers:[]}; $('#quick-test').showModal(); renderQuickQuestion();
}
function finishQuickTest() {
  const answers = quickTestState.answers;
  $('#quick-test').close('complete');
  if (!newConversation()) return;
  const turn = createTurn('我完成了一次 3 题快测，想看看目前的初步小结。', false, {quickAnswers:answers});
  run(turn);
  quickTestState = null;
}
function stop() { if (active) { active.stopped=true; active.controller.abort(); } }
function resetConversation() {
  turns.length=0; conversation.replaceChildren(); conversation.hidden=true; welcome.hidden=false;
  $('#conversation-bar').hidden=true;
  $('#visit-summary-text').value=''; $('#visit-summary-status').textContent='';
  document.body.classList.remove('in-chat'); input.value=''; resizeInput(); window.scrollTo({top:0,behavior:'instant'});
}

function topicFor(turn=turns.at(-1)) {return turn?.context?.topic || 'general';}
function riskInput(turn) {return turn.careData?turn.careData.answers.map(a=>a.answer).join('，'):turn.quickAnswers?turn.quickAnswers.map(a=>a.answer).join('，'):turn.user;}
function riskFor(turn) {
  if(turn.rag)return turn.risk || 'consult';
  const structured=careTriage(Object.fromEntries((turn.careData?.answers || []).map(a=>[a.id,a.answer])));
  const parsed=splitAnswer(turn.answer);
  const risk=responseRisk(riskInput(turn),parsed.text,parsed.care,turn.context);
  return structured==='urgent' || risk==='urgent'?'urgent':structured==='consult' || risk==='consult'?'consult':'general';
}
function renderRiskNote(turn,pending=false) {
  turn.riskNoteEl.replaceChildren();
  const risk=pending?(turn.rag?turn.risk:assessInput(riskInput(turn)).risk):riskFor(turn);
  if(risk==='general' || (turn.rag?.status==='abstained' && risk!=='urgent')) return;
  const message=risk==='urgent'?'请优先拨打 120 或寻求急诊帮助，不要等待或尝试普通调养。':'目前不能确认适合普通调养。建议先向医生说明情况；如出现持续胸痛、呼吸困难、突发无力等，请立即求助。';
  const box=element('p',risk==='urgent'?'urgent-note':'consult-note',message);box.setAttribute('role','alert');turn.riskNoteEl.append(box);
}

function sourceLink(source,label=source.title) {
  const link=element('a','source-link',label); link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',()=>metric('citationClicks'));return link;
}
function knowledgeTypeLabel(claim) {
  if(claim.knowledgeSubtype==='point-location') return '穴位位置科普';
  return ({'general-health':'一般健康知识','tcm-culture':'中医养生与导引','tcm-clinical':'中医临床知识','safety':'安全与就医边界'})[claim.knowledgeType] || '健康知识';
}
function renderEvidence(turn) {
  turn.evidenceEl.replaceChildren(); if(turn.status!=='done' || turn.example || riskFor(turn)==='urgent') return;
  if(turn.rag) {
    if(!turn.evidence?.length){turn.evidenceEl.append(element('p','source-empty',turn.rag.status==='blocked'?'本轮使用安全边界提示，未调用资料生成调养建议。':'本轮没有形成可核验的资料回答。'));return;}
    const details=element('details','evidence-panel');details.append(element('summary','',`结论与资料 · ${turn.evidence.length} 项`),element('p','evidence-note','下面的结论与行动来自本轮检索卡片。来源内容由程序与 AI 辅助整理，尚未完成人工医学复核；不代表个人诊断或疗效。'));
    for(const claim of turn.evidence){const item=element('div','evidence-item');item.append(element('span','evidence-type',knowledgeTypeLabel(claim)),element('strong','',claim.statement),sourceLink(claim.source),element('p','',`支持范围：${claim.scope}`),element('p','',`不确定性：${claim.uncertainty}`));const quote=element('details');quote.append(element('summary','','原文短摘录'),element('blockquote','',claim.sourceSpan));item.append(quote,element('small','',`${claim.source.publisher} · 原文更新 ${claim.source.publishedAt || claim.source.reviewedAt || '未标注'} · 核对 ${claim.source.checkedAt} · 复核截止 ${claim.source.expiresAt}`));if(claim.source.freshnessNote)item.append(element('p','',claim.source.freshnessNote));if(localDate()>claim.source.expiresAt)item.append(element('p','consult-note','历史资料已到复核日期，不能据此当作当前建议。'));details.append(item);}
    turn.evidenceEl.append(details);return;
  }
  const claims=evidenceFor(turn.answer,turn.sourceIds),legacy=citedSources(turn.answer,turn.sourceIds);
  if(!claims.length && !legacy.length) {turn.evidenceEl.append(element('p','source-empty','AI 一般信息 · 本轮没有匹配到可核对的结论与资料，不能视为已验证建议。'));return;}
  const details=element('details','evidence-panel'); details.append(element('summary','',claims.length?`结论与资料 · ${claims.length} 项`:'旧版模型引用 · 未逐项核对'));
  details.append(element('p','evidence-note','仅核对下面列出的固定结论与资料；其余回答未逐条验证。并非实时搜索，不证明个人诊断或疗效。'));
  for(const claim of claims) {
    const item=element('div','evidence-item');
    item.append(element('strong','',claim.statement),sourceLink(claim.source),element('p','',`支持范围：${claim.scope}`),element('p','',`局限：${claim.uncertainty}`),element('small','',`${claim.source.publisher} · 原文 ${claim.source.date} · 核对 ${claim.source.checked} · 计划复核 ${claim.reviewAfter}`));
    if(localDate()>claim.reviewAfter) item.append(element('p','consult-note','已到计划复核日期，尚未重新核对，请查阅最新原文。'));
    details.append(item);
  }
  for(const source of legacy) {const item=element('div','evidence-item');item.append(sourceLink(source),element('p','','历史模型引用，未逐条核对结论与来源的支持关系。'));details.append(item);}
  turn.evidenceEl.append(details);
}

function careSummary(data) {
  const box=element('details','confirmed-summary');
  box.append(element('summary','',data.type==='checkin'?`${data.date || ''} · ${TOPICS[data.topic]}感受记录`:'你确认的情况 · 可展开核对'));
  for(const row of careRows(data)) {const p=element('p');p.append(element('span','',row.question+' '),element('strong','',row.answer));box.append(p);}
  box.append(element('small','','这是本轮填写的记录，不是诊断。后续更正以最近确认的信息为准。'));if(data.type==='intake'){const edit=element('button','text-action','修改或撤回当前确认信息');edit.type='button';edit.addEventListener('click',()=>openCare(data.topic,'intake',true));box.append(edit);}return box;
}
function resultCard(title,description,handler) {
  const button=element('button','next-card');button.type='button';button.disabled=!!active;
  button.append(element('strong','',title),element('span','',description));button.addEventListener('click',handler);return button;
}
function openCare(topic,type='intake',edit=false) {
  if(active) {toast('请先等回答完成，或停止生成');return;}
  const fresh=!welcome.hidden || turns.some(t=>t.example);
  const known=type==='intake' && !fresh?confirmedFacts(turns,topic):{};
  const questions=type==='checkin'?CHECKIN_QUESTIONS:edit?allQuestions(topic):questionsFor(topic,known);
  careState={topic,type,fresh,known,questions,index:0,answers:{...known},withdrawn:new Set(),date:localDate(),opener:document.activeElement};
  $('#care-dialog').showModal();if(edit){careState.index=questions.length;renderCareReview();}else renderCareQuestion();
}
function renderCareQuestion() {
  const s=careState; if(!s) return;
  if(s.index>=s.questions.length) {renderCareReview();return;}
  const q=s.questions[s.index]; $('#care-kicker').textContent=s.type==='checkin'?'记下今天的感受':`${TOPICS[s.topic]} · 只补充愿意说的`;
  $('#care-progress').textContent=`${s.index+1} / ${s.questions.length}`;$('#care-title').textContent=q.question;
  $('#care-note').textContent=(q.note || '选一个最接近的。')+' 跳过不代表没有该症状。';$('#care-back').hidden=s.index===0;$('#care-skip').hidden=false;
  const body=$('#care-body');body.replaceChildren();
  if(q.text) {
    const field=element('textarea','care-text');field.id='care-free-text';field.maxLength=300;field.rows=3;field.setAttribute('aria-label',q.question);field.value=s.answers[q.id] || '';body.append(field);
    const next=element('button','dialog-confirm','下一步');next.type='button';next.addEventListener('click',()=>chooseCare(field.value.trim()));body.append(next);field.focus();
  } else {
    const options=element('fieldset','quick-options');options.append(element('legend','sr-only',q.question));
    for(const option of q.options) {const label=element('label','quick-option radio-option');const radio=element('input');radio.type='radio';radio.name='care-choice';radio.value=option;radio.checked=s.answers[q.id]===option;label.append(radio,document.createTextNode(option));options.append(label);}
    const next=element('button','dialog-confirm','下一步');next.type='button';next.addEventListener('click',()=>{const selected=options.querySelector('input:checked');if(selected) chooseCare(selected.value);else toast('先选一项，或选择暂不填写');});
    body.append(options,next);options.querySelector('input:checked,input')?.focus();
  }
}
function chooseCare(answer) {
  const s=careState;if(!s) return;const q=s.questions[s.index];
  if(answer) {s.answers[q.id]=answer;s.withdrawn.delete(q.id);}else delete s.answers[q.id];
  if(s.editing) {s.editing=false;s.index=s.questions.length;} else s.index++;
  renderCareQuestion();
}
function renderCareReview() {
  const s=careState;$('#care-kicker').textContent='发送前，再看一眼';$('#care-progress').textContent='核对';$('#care-title').textContent=s.type==='checkin'?'这是你今天的记录':'这是目前了解到的情况';
  $('#care-note').textContent='只保留你确认的信息。可以修改，也可以直接返回对话。';$('#care-back').hidden=!s.questions.length;$('#care-skip').hidden=true;
  const body=$('#care-body');body.replaceChildren();
  const risk=careTriage(s.answers);
  if(risk==='urgent') body.append(element('p','urgent-note','你选到了可能需要立即处理的情况。请现在拨打 120 或寻求急诊帮助，不要等待这里的问答。'));
  if(risk==='consult') body.append(element('p','consult-note','你提供的情况值得优先向医生咨询；日常建议不能替代评估。'));
  if(s.type==='checkin') {const label=element('label','field-label','记录日期');label.htmlFor='care-date';const date=element('input');date.type='date';date.id='care-date';date.value=s.date;date.max=localDate();date.addEventListener('change',()=>{s.date=date.value;});body.append(label,date);}
  const fields=s.type==='checkin'?CHECKIN_QUESTIONS:allQuestions(s.topic);
  for(const q of fields) {
    const row=element('div','review-row');const copy=element('div');copy.append(element('small','',q.question),element('strong','',s.answers[q.id] || (s.withdrawn.has(q.id)?'待撤回 · 确认后不再用于后续回答':'暂未提供')));
    const edit=element('button','text-action','修改');edit.type='button';edit.setAttribute('aria-label',`修改：${q.question}`);edit.addEventListener('click',()=>{let index=s.questions.findIndex(item=>item.id===q.id);if(index<0){s.questions.push(q);index=s.questions.length-1;}s.editing=true;s.index=index;renderCareQuestion();});const actions=element('div','review-actions');actions.append(edit);if(s.answers[q.id]) {const remove=element('button','text-action','撤回');remove.type='button';remove.setAttribute('aria-label',`撤回：${q.question}`);remove.addEventListener('click',()=>{delete s.answers[q.id];s.withdrawn.add(q.id);renderCareReview();});actions.append(remove);}row.append(copy,actions);body.append(row);
  }
  const confirm=element('button','dialog-confirm',risk==='urgent'?'保存情况，查看求助提示':'确认并发送给本草');confirm.type='button';confirm.disabled=!canConfirmCare(s.answers,s.type,s.known);
  confirm.addEventListener('click',finishCare);body.append(confirm);$('#care-title').focus();
}
function finishCare() {
  const s=careState;if(!s || active) return;
  if(s.type==='checkin' && (!/^\d{4}-\d{2}-\d{2}$/.test(s.date) || s.date>localDate())) {toast('请选择今天或之前的记录日期');return;}
  const data=normalizeCareData({type:s.type,topic:s.topic,date:s.date,replace:s.type==='intake',answers:Object.entries(s.answers).map(([id,answer])=>({id,answer}))});
  if(!canConfirmCare(s.answers,s.type,s.known)) return;
  if(s.fresh && !newConversation()) return;
  $('#care-dialog').close();
  const title=!data.answers.length?`我撤回了之前确认的${TOPICS[s.topic]}信息，想重新梳理。`:s.type==='checkin'?`${s.date}，我记录了${TOPICS[s.topic]}感受。`:`我补充了${TOPICS[s.topic]}相关情况，想看看下一步怎么做。`;
  run(createTurn(title,false,{careData:data}));careState=null;
}
function readPreferenceRecord() {try {return loadLocalPreference(localStorage);}catch{return null;}}
function renderModelStatus() {
  const status=modelStatus();
  const button=$('#model-status');
  if(button) { button.textContent=status.label; button.title=status.model ? `${status.label} · ${status.model}` : status.label; }
}
function openModelSettings() {
  if(active) {toast('请先停止当前回答，再修改模型连接');return;}
  const current=getModelConfig();
  $('#model-protocol').value=current?.protocol || 'responses';
  $('#model-base-url').value=current?.baseUrl || '';
  $('#model-api-key').value='';
  $('#model-name').value=current?.model || '';
  $('#model-settings-status').textContent=current ? `当前使用本页自有 API（${current.model}）。如需修改，请重新填写 Key。` : '尚未连接模型。请填写自己的 API 后使用。';
  $('#model-settings').showModal();
}
function modelFormValue() {
  return {protocol:$('#model-protocol').value,baseUrl:$('#model-base-url').value,apiKey:$('#model-api-key').value,model:$('#model-name').value};
}
function cancelModelTest() {
  if(modelTestController) modelTestController.abort();
  modelTestController=null;
  $('#model-test').disabled=false;
  $('#model-save').disabled=false;
}
function clearModelConnection() {
  cancelModelTest();
  clearModelConfig();
  $('#model-settings-form').reset();
  $('#model-api-key').value='';
  $('#model-settings-status').textContent='';
  renderModelStatus();
}
async function testModelConnection() {
  cancelModelTest();
  const controller=new AbortController();modelTestController=controller;
  const status=$('#model-settings-status');
  $('#model-test').disabled=true;$('#model-save').disabled=true;
  status.textContent='正在测试连接（会消耗少量额度）…';
  const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    await testModelConfig(modelFormValue(),{signal:controller.signal});
    if(modelTestController===controller) status.textContent='已收到模型回答。点击“保存并使用”后用于问答；实际问答还需模型支持结构化输出。';
  } catch(error) {
    if(modelTestController===controller) status.textContent=controller.signal.aborted?'连接测试超时，请检查接口后重试。':error.code ? friendlyError(error) : '未收到有效模型回答，请检查地址、协议、Key 和模型名称。';
  } finally {
    clearTimeout(timeout);
    if(modelTestController===controller) cancelModelTest();
  }
}
function saveModelConnection(event) {
  event.preventDefault();
  if(active || modelTestController) return;
  try { setModelConfig(modelFormValue()); $('#model-api-key').value=''; renderModelStatus(); $('#model-settings').close(); toast('已切换为本页自有 API'); }
  catch(error) { $('#model-settings-status').textContent=error.message || '保存失败，请检查填写内容。'; }
}

function openPreferences() {
  const record=readPreferenceRecord(),value=activePreferences(record,{intent:'lifestyle'});
  $('#preference-approach').value=value?.approach || '都可以';$('#preference-food').value=value?.food || '';
  $('#preferences-status').textContent=value?`保存至 ${new Date(record.expiresAt).toLocaleDateString('zh-CN')}，可随时清除。`:record?'旧偏好或已到期的偏好不会自动使用，请重新确认保存。':'目前没有保存偏好。';$('#preferences-dialog').showModal();
}
function ensureEpoch() {
  try{if(dataEpoch(localStorage)!==storageEpoch){forgetInMemory();toast('其他标签页已清除数据，请重新输入');return false;}}catch{/* Storage warnings handled by save. */}
  return true;
}
function forgetInMemory() {
  clearModelConnection();
  clearTimeout(saveTimer);saveTimer=null;
  if(active){active.cleared=true;active.controller.abort();active=null;}
  currentSession=null;historySessions=[];saveFailed=false;quickTestState=null;careState=null;
  try{storageEpoch=dataEpoch(localStorage);sessionStorage.removeItem(NAV_KEY);}catch{/* Still clear the visible page. */}
  for(const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('#preference-food').value='';$('#preference-approach').value='都可以';$('#preferences-status').textContent='';
  $('#care-body').replaceChildren();$('#quick-options').replaceChildren();$('#delete-session-title').textContent='';pendingDeleteId=null;
  clearImagePreview();resetConversation();storageWarning('');renderHistory();updateBusy();renderMetrics();
}

function renderSleepGuide() {
  const cards=[
    {title:'白天，给身体一点舒展',text:'如果身体状况允许，可以把八段锦当作一种轻量活动和放松选择。先跟正规教学学动作，以舒适为准，不憋气、不硬拉；有伤病或运动限制时先咨询专业人员。',id:'baduanjin'},
    {title:'晚餐，吃得舒服一点',text:'先从熟悉、能吃得舒服的一餐开始，不必找“神奇助眠食物”。尽量不吃得过饱或过晚；若睡前茶、咖啡或酒精影响睡眠，可以调整时间和选择。',id:'sleep-core'},
    {title:'睡前，留一点慢下来的时间',text:'给自己安排一段安静的放松时间，有困意再上床，并尽量保持规律起床。一晚没睡好不必自责；持续影响生活时，寻求专业帮助也是照顾自己。',id:'nhs-insomnia'}
  ];
  $('#sleep-guide-cards').replaceChildren();for(const card of cards) {const item=element('article','guide-card');item.append(element('h3','',card.title),element('p','',card.text),sourceLink(SOURCES.find(s=>s.id===card.id),'查看对应资料 ↗'));$('#sleep-guide-cards').append(item);}
  $('#sleep-guide').showModal();
}

form.addEventListener('submit', event => { event.preventDefault(); if (active) stop(); else submit(input.value); });
input.addEventListener('input',resizeInput);
input.addEventListener('keydown',event => {
  if(event.key==='Enter' && !event.shiftKey && !event.isComposing && window.matchMedia('(min-width:801px)').matches) {
    event.preventDefault(); if (!active) submit(input.value);
  }
});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.question)));
$('#quick-test-start').addEventListener('click', startQuickTest);
$('#quick-skip').addEventListener('click', () => { $('#quick-test').close('skip'); input.focus(); });
$('#quick-back').addEventListener('click', () => {
  if (!quickTestState || quickTestState.index === 0) return;
  quickTestState.index -= 1; quickTestState.answers.pop(); renderQuickQuestion();
});
$('#quick-test').addEventListener('close', () => { quickTestState = null; });
$('#visit-summary-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#visit-summary-text').value);
    $('#visit-summary-status').textContent = '已复制，可粘贴给医生或药师。';
  } catch {
    $('#visit-summary-text').focus(); $('#visit-summary-text').select();
    $('#visit-summary-status').textContent = '请长按或使用复制快捷键，复制已选中的文字。';
  }
});
document.querySelectorAll('.about-button').forEach(button=>button.addEventListener('click',()=>$('#about').showModal()));
document.querySelectorAll('.new-chat').forEach(button=>button.addEventListener('click',()=>{if(newConversation()) input.focus();}));
document.querySelectorAll('.home-link').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();goHome();}));
document.querySelectorAll('.history-trigger').forEach(button=>button.addEventListener('click',()=>{refreshHistory();$('#history-dialog').showModal();}));
document.querySelectorAll('.export-history').forEach(button=>button.addEventListener('click',exportHistory));
$('#resume-chat').addEventListener('click',()=>{showConversation();rememberView('chat');scrollLatest();});
$('#delete-session').addEventListener('close',()=>{
  const id=pendingDeleteId; pendingDeleteId=null;
  if ($('#delete-session').returnValue!=='delete' || !id) return;
  try {
    deleteSession(localStorage,id);
    if (id===currentSession?.id) {clearTimeout(saveTimer);currentSession=null;saveFailed=false;storageWarning('');resetConversation();rememberView('home');}
    refreshHistory(); toast('已删除这段对话');
  } catch { storageWarning('删除失败，记录仍保留，请稍后重试。'); }
});
$('#show-example').addEventListener('click',()=>{
  if (!newConversation()) return;
  showConversation(); conversation.append(element('div','example-banner','这是一段预先编写的体验示例，展示回答与追问方式。配置自己的 API 后，输入问题即可开始真实对话。'));
  const first=createTurn('最近总觉得累，没精神，是脾虚吗？',true);
  first.answer='总觉得累，不一定就是脾虚。**睡眠不足、压力、贫血、甲状腺问题等**也可能引起疲惫；中医判断还需要结合饮食、排便等表现，不能凭这一个症状下结论。\n\n### 现在可以先做的两件事\n- 保持规律作息，给自己足够的睡眠时间，避免靠浓茶或咖啡硬撑。\n- 按时吃饭，适度活动，先不急着自行吃“补气健脾”的药。\n\n这种疲惫大约持续多久了？最近睡眠怎么样？';
  first.status='done';renderMarkdown(first.answerEl,first.answer);renderActions(first);
  const second=createTurn('大概两周了，最近经常凌晨两点睡。',true);
  second.answer='你提到的**持续两周、经常晚睡**是很有用的信息。睡眠不足可能参与了疲惫，但现在还不能据此确认原因，也不足以判断“脾虚”。\n\n### 先从睡眠调整开始\n- 尝试逐步提前就寝时间，固定起床时间，给自己留出充足的睡眠。\n- 睡前减少工作和屏幕刺激；下午、晚间尽量避免摄入咖啡因。\n\n如果调整后仍然明显疲惫，或影响工作生活，建议就诊评估；若同时出现胸痛、气短、晕厥等表现，应及时就医。';
  second.status='done';renderMarkdown(second.answerEl,second.answer);renderActions(second);
  window.scrollTo({top:0,behavior:'instant'});
});

$('#visit-summary-open').addEventListener('click',openVisitSummary);
document.querySelectorAll('.privacy-trigger').forEach(button=>button.addEventListener('click',()=>{renderMetrics();$('#privacy-dialog').showModal();}));
$('#clear-all-open').addEventListener('click',()=>$('#clear-all-dialog').showModal());
$('#clear-all-confirm').addEventListener('click',()=>{try{clearLocalData(localStorage);forgetInMemory();toast('已清除本草的本机记录、偏好与统计');}catch{forgetInMemory();refreshHistory();storageWarning('部分数据未能清除，请重试或在浏览器设置中清除本站数据。');}});
$('#care-close').addEventListener('click',()=>$('#care-dialog').close());
$('#care-dialog').addEventListener('close',()=>{const opener=careState?.opener;careState=null;if(opener?.isConnected)opener.focus();});
$('#care-exit').addEventListener('click',()=>$('#care-dialog').close());
$('#care-back').addEventListener('click',()=>{if(careState){if(careState.editing){careState.editing=false;careState.index=careState.questions.length;}else careState.index=Math.max(0,careState.index-1);renderCareQuestion();}});
$('#care-skip').addEventListener('click',()=>chooseCare(''));
document.querySelectorAll('.model-trigger').forEach(button=>button.addEventListener('click',openModelSettings));
$('#model-settings-close').addEventListener('click',()=>$('#model-settings').close());
$('#model-settings').addEventListener('close',()=>{cancelModelTest();$('#model-api-key').value='';});
$('#model-settings').addEventListener('cancel',()=>{cancelModelTest();$('#model-api-key').value='';});
$('#model-settings-form').addEventListener('input',()=>{cancelModelTest();$('#model-settings-status').textContent='配置已修改，请测试或保存。';});
$('#model-test').addEventListener('click',testModelConnection);
$('#model-settings-form').addEventListener('submit',saveModelConnection);
$('#model-clear').addEventListener('click',()=>{clearModelConnection();$('#model-settings').close();toast('已清除 API，问答前需重新配置');});
document.querySelectorAll('.preferences-trigger').forEach(button=>button.addEventListener('click',openPreferences));
$('#preferences-close').addEventListener('click',()=>$('#preferences-dialog').close());
$('#preferences-form').addEventListener('submit',event=>{event.preventDefault();
  if(!ensureEpoch()) return;
  const value=preferenceRecord({approach:$('#preference-approach').value,food:$('#preference-food').value});
  try {saveLocalPreference(localStorage,value,storageEpoch);$('#preferences-status').textContent='已保存 30 天。仅在勾选使用偏好时，发送给模型用于症状/日常建议。';toast('偏好已保存');}catch{$('#preferences-status').textContent='保存失败，偏好未更新。请稍后重试。';}
});
$('#preferences-clear').addEventListener('click',()=>{try{localStorage.removeItem(PREF_KEY);$('#preference-approach').value='都可以';$('#preference-food').value='';$('#preferences-status').textContent='已清除。后续问答不再使用这些偏好，历史回答保留原样。';}catch{$('#preferences-status').textContent='清除失败，请稍后重试。';}});
$('#sleep-guide-personalize').addEventListener('click',()=>{$('#sleep-guide').close();submit('请结合我已描述的睡眠情况和确认的偏好，帮我选一项适合今天尝试的日常调整，说明依据和需要留意的情况。');});

function renderMetrics() {
  const value=readMetrics(localStorage);$('#metrics-consent').checked=value.enabled;
  $('#metrics-summary').textContent=value.enabled?`仅本机计数：提问 ${value.counts.queries} · 检索命中 ${value.counts.retrievalHits}/${value.counts.retrievalAttempts} · 资料回答 ${value.counts.groundedAnswers} · 弃答 ${value.counts.abstentions} · 依据点击 ${value.counts.citationClicks} · 纠正 ${value.counts.corrections} · 安全拦截 ${value.counts.riskBlocks}。这些计数不代表医学准确率。`:'未开启使用统计。';
}
$('#metrics-consent').addEventListener('change',()=>{try{setMetricsConsent(localStorage,$('#metrics-consent').checked,storageEpoch);renderMetrics();}catch{toast('统计设置未保存');}});
let imageUrl=null,imageRequest=0;
function clearImagePreview() {
  imageRequest++;if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=null;
  $('#image-file').value='';$('#image-preview').removeAttribute('src');$('#image-preview').hidden=true;$('#image-status').textContent='照片只在当前窗口预览，不上传、不保存、不做诊断。';
}
$('.image-trigger').addEventListener('click',()=>$('#image-dialog').showModal());
$('#image-clear').addEventListener('click',clearImagePreview);
$('#image-dialog').addEventListener('close',clearImagePreview);
$('#image-file').addEventListener('change',async()=>{
  const file=$('#image-file').files[0];clearImagePreview();if(!file)return;
  const generation=imageRequest;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){$('#image-status').textContent='请选择不超过 8 MB 的 JPG、PNG 或 WebP 图片。';return;}
  try {
    const decoded=await createImageBitmap(file);let result;
    const canvas=document.createElement('canvas');
    try {
      const scale=Math.min(1,256/Math.max(decoded.width,decoded.height));
      canvas.width=Math.max(1,Math.round(decoded.width*scale));canvas.height=Math.max(1,Math.round(decoded.height*scale));
      let sample;
      try {const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(decoded,0,0,canvas.width,canvas.height);sample=context.getImageData(0,0,canvas.width,canvas.height);}catch{/* Preview can still work when local pixel inspection is unavailable. */}
      result=imageQuality({type:file.type,size:file.size,width:decoded.width,height:decoded.height,sample});
    }finally{decoded.close();canvas.width=canvas.height=0;}
    if(generation!==imageRequest)return;
    $('#image-status').textContent=result.message+' 图片没有上传；关闭窗口或点“移除照片”即清除预览。';
    if(result.ok){imageUrl=URL.createObjectURL(file);$('#image-preview').src=imageUrl;$('#image-preview').hidden=false;}
  }catch{if(generation===imageRequest)$('#image-status').textContent='图片无法解码，请换一张 JPG、PNG 或 WebP 图片。';}
});

refreshHistory();
try { const last=JSON.parse(sessionStorage.getItem(NAV_KEY)); if(last?.id && last.view==='chat') openSession(last.id); } catch { /* Open the home page if navigation metadata is unavailable. */ }
window.addEventListener('pagehide',()=>{persistSession();clearModelConnection();});
document.addEventListener('visibilitychange',()=>{if(document.hidden) persistSession();});
window.addEventListener('storage',event=>{if(event.key===EPOCH_KEY || event.key===null){forgetInMemory();toast('本机数据已在其他标签页清除');}else if(event.key?.startsWith('bencao.chat.v1.')) refreshHistory();});
resizeInput();
renderModelStatus();
new ResizeObserver(entries => {
  $('#main').style.paddingBottom = `${entries[0].target.offsetHeight + 30}px`;
}).observe($('.composer-dock'));

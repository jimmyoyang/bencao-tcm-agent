// Curated reading, checked against the original pages; no live search or clinical diagnosis.
export const SOURCES = [
  {id:'sleep-core',title:'睡眠健康核心信息及释义',publisher:'全国爱卫办 · 国家卫生健康委',date:'2025-03-18',checked:'2026-11-05',url:'https://www.nhc.gov.cn/guihuaxxs/c100133/202503/70d5836afe804a858b899ee951a24a13.shtml',scope:'规律作息、饮食与活动；需要就诊的睡眠信号',summary:'保持规律作息、适度活动与舒适的睡眠环境；晚餐不过饱过晚，睡前减少茶、咖啡、酒精和长时间剧烈运动。反复打鼾伴呼吸间歇，或睡眠问题影响健康和日常生活，应寻求专业帮助。中医针灸、推拿、中药等治疗需根据具体证候辨证施治，不能自行按症状套方。'},
  {id:'baduanjin',title:'天坛科普——八段锦 老祖宗传下来的助眠秘方',publisher:'北京天坛医院 · 北京市卫健委',date:'2025-03-17',checked:'2026-11-05',url:'https://wjw.beijing.gov.cn/bmfw_20143/jkzs/jksh/202503/t20250317_4036769.html',scope:'传统导引运动与日常放松；医院科普，非个体疗效证明',summary:'八段锦是配合身体动作与呼吸的传统导引运动，节奏舒缓，可作为日常活动与放松的选项。该资料为医院科普，没有列出试验细节，不应据此承诺治疗失眠或给出效果数字。不复述“神器”“人人都适合”等宣传性说法。初学者应看正规教学或请专业人员指导，有运动限制者先咨询，动作不勉强，不舒服就停。'},
  {id:'nhs-insomnia',title:'Insomnia（失眠）',publisher:'英国 NHS',date:'2024-03-19',checked:'2026-11-05',url:'https://www.nhs.uk/conditions/insomnia/',scope:'日常睡眠习惯、就诊时机与认知行为治疗',summary:'有困意再上床、固定起床时间、睡前放松、白天规律活动。改变习惯仍无改善、持续数月或影响日常生活时应就医评估。认知行为治疗可帮助处理维持失眠的想法和行为；睡眠呼吸暂停等需要专业评估。不要自行长期服用助眠药。'}
];
export const FACT_TTL=7*24*60*60*1000;
export function recentTurn(turn,now=Date.now()) {return turn.createdAt===undefined || (Number.isFinite(turn.createdAt) && turn.createdAt>0 && now-turn.createdAt<=FACT_TTL && turn.createdAt<=now);}
export const TOPICS={sleep:'睡眠',fatigue:'疲惫',digest:'消化',women:'女性日常',stress:'情绪压力',wellness:'日常活动',general:'身体状态'};
// Fixed statements mapped to checked source summaries, not model-authored support claims.
export const CLAIMS=[
  {id:'sleep-routine',statement:'有困意再上床，并尽量固定起床时间。',sourceId:'nhs-insomnia',scope:'一般成人睡眠习惯调整',uncertainty:'不能据此判断失眠病因，也不保证单靠作息调整有效。'},
  {id:'sleep-dinner',statement:'晚餐尽量不过饱、不过晚，留意茶、咖啡和酒精对睡眠的影响。',sourceId:'sleep-core',scope:'日常饮食与睡眠习惯',uncertainty:'不是个体饮食处方，不表示某种食物可以治疗失眠。'},
  {id:'sleep-consult',statement:'睡眠问题影响日常生活时，应寻求专业评估。',sourceId:'nhs-insomnia',scope:'睡眠问题的就诊时机',uncertainty:'实际就诊紧迫程度取决于症状；危险信号应立即求助。'},
  {id:'sleep-apnea',statement:'反复打鼾伴呼吸停顿，应寻求专业评估。',sourceId:'sleep-core',scope:'提示可能需要评估的睡眠表现',uncertainty:'此信号不能独立确诊睡眠呼吸暂停。'},
  {id:'movement-intro',statement:'八段锦是配合身体动作与呼吸的传统导引运动，可作为日常活动和放松的选择。',sourceId:'baduanjin',scope:'传统导引知识与一般日常活动',uncertainty:'医院科普未提供试验细节，不能证明对个人失眠的治疗效果；有运动限制者需先咨询专业人员。'}
];
const common=[
  {id:'duration',question:'这种情况大概多久了？',note:'时间有助于决定下一步。已经说过的可以跳过。',options:['几天内','大约 1—2 周','2 周到 3 个月','超过 3 个月','反复出现，说不清时间']},
  {id:'impact',question:'对你的日常影响有多大？',note:'以你的真实感受为准，不需要忍到很严重才寻求帮助。',options:['有些困扰，但日常基本正常','已经影响工作、学习或心情','明显影响日常生活']}
];
const patterns={
  sleep:{question:'睡眠最困扰你的是哪一种？',options:['入睡比较难','夜间容易醒','醒得太早，难再睡着','睡醒仍觉得累','作息不规律或轮班']},
  fatigue:{question:'疲惫通常是什么样的？',options:['醒来就觉得累','忙完一天特别累','休息后仍然没精神','活动时更明显','暂时说不清']},
  digest:{question:'胃口或消化主要哪里不舒服？',options:['胃口不好','饭后胀或不舒服','反酸、烧心','排便不规律','腹部疼痛或其他不适']},
  women:{question:'目前最想聊的是哪方面？',options:['经期腹部不适','经前情绪或身体变化','周期不规律或变化','日常饮食和活动','暂时说不清']},
  stress:{question:'压力主要影响到哪方面？',options:['容易紧张或担心','心情烦躁','很难放松下来','影响睡眠或精力','暂时说不清']},
  wellness:{question:'你想先了解哪种日常调整？',options:['减少久坐','温和活动和八段锦','均衡饮食','规律生活','暂时说不清']},
  general:{question:'你最想先照顾哪一方面？',options:['身体不舒服','作息与精力','饮食与日常活动','情绪和压力','暂时说不清']}
};
const associated={
  sleep:['没有这些情况','打鼾，曾被发现睡着时呼吸停顿','最近几乎不睡却异常兴奋','现在胸痛伴气短、冷汗或晕厥'],
  fatigue:['没有这些情况','同时有发热、消瘦或心悸','最近开始或调整过药物','现在胸痛伴气短、冷汗或晕厥'],
  digest:['没有这些情况','反复呕吐、吞咽困难或消瘦','现在呕血、黑便或剧烈腹痛','现在胸痛伴气短、冷汗或晕厥'],
  women:['没有这些情况','可能妊娠或正在哺乳','疼痛或出血明显影响日常','现在大量出血或晕厥'],
  stress:['没有这些情况','已经明显影响工作或生活','现在有伤害自己的想法','最近几乎不睡却异常兴奋'],
  wellness:['没有这些情况','有伤病或医生要求限制运动','现在胸痛伴气短、冷汗或晕厥'],
  general:['没有这些情况','症状持续加重','现在胸痛伴气短、冷汗或晕厥','现在突发一侧无力或言语不清']
};
export const CHECKIN_QUESTIONS=[
  {id:'feeling',question:'和上次相比，今天感觉如何？',options:['比之前好些','差不多','更不舒服了','还说不准']},
  {id:'tried',question:'你尝试了什么？也可以填“还没试”。',note:'没有打卡任务，照实记就好。',text:true},
  {id:'note',question:'还有想记下来的感受吗？',note:'例如睡眠、身体不适、心情或遇到的困难。',text:true}
];
export function allQuestions(topic='general') {
  const key=Object.hasOwn(TOPICS,topic)?topic:'general';
  return [{id:'pattern',...patterns[key]},common[0],common[1],{id:'associated',question:'还有以下情况吗？',note:'用于提醒是否需要优先就医；没有列出所有风险，跳过不代表没有风险。',options:associated[key]}];
}
export function questionsFor(topic,known={}) { return allQuestions(topic).filter(q=>!known[q.id]); }
export function detectTopic(text='',fallback='general') {
  if(/经期|经前|月经|例假|痛经/.test(text)) return 'women';
  if(/压力|情绪|紧张|焦虑|烦躁/.test(text)) return 'stress';
  if(/久坐|运动|八段锦|均衡饮食/.test(text)) return 'wellness';
  if(/睡|失眠|早醒|夜[里间].{0,8}醒|晚上.{0,5}醒|白天.{0,6}困/.test(text)) return 'sleep';
  if(/疲|乏力|没精神|累/.test(text)) return 'fatigue';
  if(/胃|消化|反酸|腹|排便/.test(text)) return 'digest';
  return Object.hasOwn(TOPICS,fallback)?fallback:'general';
}
export function normalizeCareData(data) {
  if(!data || !['intake','checkin'].includes(data.type) || !Object.hasOwn(TOPICS,data.topic) || !Array.isArray(data.answers)) return null;
  const fields=data.type==='checkin'?CHECKIN_QUESTIONS:allQuestions(data.topic);
  const allowed=new Set(fields.map(q=>q.id));
  const answers=new Map();
  for(const item of data.answers) if(item && allowed.has(item.id) && typeof item.answer==='string' && item.answer.trim() && item.answer!=='暂不填写') answers.set(item.id,{id:item.id,answer:item.answer.trim().slice(0,300)});
  const clean={type:data.type,topic:data.topic,answers:[...answers.values()]};
  if(data.type==='intake' && data.replace===true) clean.replace=true;
  if(data.type==='checkin' && /^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) clean.date=data.date;
  return clean;
}
export function careRows(data) {
  const clean=normalizeCareData(data); if(!clean) return [];
  const questions=clean.type==='checkin'?CHECKIN_QUESTIONS:allQuestions(clean.topic);
  return clean.answers.map(a=>({question:questions.find(q=>q.id===a.id).question,answer:a.id==='associated' && a.answer==='没有这些情况' ? '没有这些情况（本题列出的具体范围：'+associated[clean.topic].filter(item=>item!=='没有这些情况').join('；')+'）' : a.answer}));
}
export function confirmedFacts(turns,topic,now=Date.now()) {
  const known={};
  for(const turn of turns.filter(t=>!t.example && recentTurn(t,now))) {
    const data=normalizeCareData(turn.careData);
    if(data?.type==='intake' && data.topic===topic) {
      if(data.replace) for(const id of Object.keys(known)) delete known[id];
      for(const a of data.answers) known[a.id]=a.answer;
    }
    if(turn.quickAnswers && detectTopic(turn.quickAnswers[0]?.answer)!=='general' && detectTopic(turn.quickAnswers[0]?.answer)===topic) {
      const duration=turn.quickAnswers.find(a=>a.question.includes('多久'));
      if(duration) known.duration=duration.answer;
    }
  }
  return known;
}
export function careTriage(facts={}) {
  if(['现在胸痛伴气短、冷汗或晕厥','现在呕血、黑便或剧烈腹痛','现在突发一侧无力或言语不清','现在大量出血或晕厥','现在有伤害自己的想法'].includes(facts.associated)) return 'urgent';
  if(facts.impact==='明显影响日常生活' || (facts.associated && !['没有这些情况','暂不填写'].includes(facts.associated))) return 'consult';
  return 'general';
}
export function carePrompt(data) {
  const clean=normalizeCareData(data);if(!clean) return '';
  const rows=careRows(clean).map(a=>`${a.question} ${a.answer}`).join('\n');
  if(clean.type==='checkin') return `我记录了${clean.date || '今天'}的${TOPICS[clean.topic]}感受，以下是我确认的原话：\n${rows}\n请结合我之前的描述回应，有必要时调整建议；不能把一次好转直接归因为某项方法，也不据此判断疗效。`;
  if(clean.replace && !clean.answers.length) return `我撤回了之前确认的${TOPICS[clean.topic]}选项。目前这些信息全部未知，请不要沿用先前已撤回的答案，可以重新和我梳理。`;
  return `我补充并确认了${TOPICS[clean.topic]}相关情况：\n${rows}\n未填写的项目是未知，不代表没有症状。请结合之前信息，按「目前的小结」「今天可以选一件」「需要留意」给出简短回应；这不是诊断，只追问一个真正影响下一步且尚未提供的信息。`;
}
export function validSourceIds(ids=[]) { return Array.isArray(ids)?[...new Set(ids.filter(id=>SOURCES.some(s=>s.id===id)))]:[]; }
export function sourceIdsFor(topic) { return topic==='sleep'?SOURCES.map(s=>s.id):topic==='movement'?['baduanjin']:[]; }
export function citedSources(text,provided=[]) {
  const found=new Set([...text.matchAll(/\[来源:([\w-]+)\]/g)].map(m=>m[1]));
  return validSourceIds(provided).filter(id=>found.has(id)).map(id=>SOURCES.find(s=>s.id===id));
}
export function evidencePrompt(ids=[]) {
  const sources=validSourceIds(ids).map(id=>SOURCES.find(s=>s.id===id));
  if(!sources.length) return '\n本轮未提供已核对资料。不要编造出处、搜索结果、机构背书、链接或疗效数字。';
  return '\n以下为已核对的精选资料摘要，不是实时搜索。不得输出旧的[来源:id]标记或自行编造链接。需要依据时从固定结论中选1—2条适用内容，逐字放入正文（该句不加粗、不改写），再在末尾输出 <<EVIDENCE>> JSON数组，每项为 {"claimId":"固定结论id","quote":"正文中逐字出现的固定结论"}。无适用内容输出空数组。其余正文不得据此声称已核验；来源不证明个人诊断或疗效。\n'+sources.map(s=>`资料id=${s.id}；${s.title}；${s.publisher}；${s.date}。可支持范围：${s.scope}。摘要：${s.summary}`).join('\n')+'\n固定结论：'+JSON.stringify(CLAIMS.filter(c=>ids.includes(c.sourceId)));
}
export function evidenceFor(raw='',provided=[]) {
  const body=raw.split('<<')[0];
  let claims;try{claims=JSON.parse(raw.match(/<<EVIDENCE>>\s*([^<]*)/)?.[1]);}catch{return [];}
  if(!Array.isArray(claims)) return [];
  const seen=new Set();
  return claims.slice(0,8).flatMap(item=>{
    const claim=CLAIMS.find(c=>c.id===item?.claimId);
    if(!claim || seen.has(claim.id) || !provided.includes(claim.sourceId) || item.quote!==claim.statement || !body.includes(claim.statement)) return [];
    seen.add(claim.id);return [{...claim,source:SOURCES.find(s=>s.id===claim.sourceId),reviewAfter:'2027-02-05'}];
  });
}
export function cleanPreferences(value={}) {
  return {approach:['都可以','作息与放松','轻量活动','日常饮食'].includes(value?.approach)?value.approach:'都可以',food:typeof value?.food==='string'?value.food.trim().slice(0,200):''};
}
export function preferenceRecord(value,now=Date.now()) {return {...cleanPreferences(value),savedAt:now,expiresAt:now+30*24*60*60*1000};}
export function activePreferences(record,context,now=Date.now()) {
  if(!record || !['symptom','lifestyle'].includes(context?.intent) || !Number.isFinite(record.savedAt) || !Number.isFinite(record.expiresAt) || record.expiresAt<=now) return null;
  return cleanPreferences(record);
}
export function localDate() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export function answerWithSources(text,provided=[]) {
  const sources=citedSources(text,provided),claims=evidenceFor(text,provided);
  const body=text.split('<<')[0].trim().replace(/\[来源:([\w-]+)\]/g,(_,id)=>{const index=sources.findIndex(s=>s.id===id);return index<0?'（出处未核实）':`[${index+1}，旧版模型引用]`;});
  return body+(claims.length?'\n\n结论与资料（仅核对列出结论，不代表整段回答已验证）\n'+claims.map(c=>`${c.statement}\n来源：${c.source.title}\n${c.source.url}\n支持范围：${c.scope}\n局限：${c.uncertainty}\n核对日期：${c.source.checked}；计划复核：${c.reviewAfter}`).join('\n\n'):'')+(sources.length?'\n\n旧版模型引用（未逐项核对支持关系）\n'+sources.map((s,i)=>`[${i+1}] ${s.title} · ${s.publisher}\n${s.url}`).join('\n'):'');
}

export function canConfirmCare(answers,type,known={}) { return Object.values(answers).some(Boolean) || (type==='intake' && Object.keys(known).length>0); }

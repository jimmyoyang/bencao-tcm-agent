// A small, inspectable safety net. It cannot rule out emergencies or diagnose.
export const INTENTS=['knowledge','symptom','lifestyle','medication','unknown'];
export const CONTEXT_TOPICS=['sleep','fatigue','digest','movement','medicine','women','stress','wellness','general'];
const knowledge=/什么是|是什么意思|是什么(?:[？?。！!]|$)|介绍|科普|原理|区别|适合(?:谁|哪些人)|人人.{0,4}适合|有哪些(?:种类|作用|特点)|功效是什么/;
// Broad question words classify intent only; they do not suppress safety reports.
const question=/怎么回事|为什么|有什么|在哪里|哪里有|有哪些|多少|是什么|什么原因|常见原因|什么关系|什么帮助|一定.{0,12}吗|会不会|有没有|有影响吗|影响.{0,8}吗|(?:正|异)常吗|靠谱吗/;
const personal=/我(?:最近|现在|总|这|的|有|已经|失眠|睡不|便秘|拉肚子|焦虑|怀孕|在哺乳)|我爸|我妈|家人|孩子|患者|病人|有人|他(?:现在|刚|突然|嘴)|她(?:现在|刚|突然)/;
const symptoms=/睡不[好着]|失眠|入睡困难|夜[里间].{0,8}醒|晚上.{0,5}醒|早醒|白天.{0,5}困|没精神|精力不足|提不起劲|没力气|力气不太有|疲[惫劳乏]|觉得累|总是累|累了|饿得没劲|乏力|胃[胀痛口]|没胃口|反酸|烧心|肚子|腹[痛胀泻]|胀气|鼓胀|饭后胀|吃撑|便秘|排便困难|拉不出来|拉稀|大便(?:偏)?干|憋便|胸[痛闷]|胸口|喘|气短|黑便|吐血|呕血|发麻|头痛|(?:月经|例假|姨妈).{0,6}(?:乱|不规律|痛|不调)|痛经|情绪差|焦虑|紧张|心慌/;
function personalSymptoms(text) {
  return symptoms.test(text) && (personal.test(text) || /最近|这几天|这段时间|一直|经常|怎么办|怎么回事|怎么调|怎样|如何|什么情况|能练|能吃/.test(text));
}
const populations=['adult','pregnant','lactating','child'];
function withoutPopulationDenials(text) {
  return text.replace(/(?:没有|没|未|不是|并非|不在|不处于|已经不在).{0,4}(?:怀孕|妊娠|孕妇|哺乳期)/g,'');
}

function populationOf(raw,prior='adult') {
  const text=String(raw).replace(/\s/g,'');
  // Topic words alone (e.g. “妊娠是什么意思”) do not identify the speaker.
  const denied=(prior==='pregnant' && /(?:没有|没|未|不是|并非|不在|不处于|已经不在).{0,4}(?:怀孕|妊娠|孕妇)/.test(text))
    || (prior==='lactating' && /(?:没有|没|未|不是|并非|不在|不处于|已经不在).{0,4}哺乳期/.test(text))
    || (prior==='child' && /我是成年人/.test(text));
  const stated=withoutPopulationDenials(text);
  if(/(?:我|妻子|老婆|女友|爱人|本人).{0,10}(?:怀孕|妊娠|孕妇)|(?:孕[早中晚]?期|孕妇|妊娠期).{0,18}(?:怎么办|怎么|如何|能|吃|喝|调理|难受)|(?:^|[，,。；;])(?:孕\d+周|怀孕\d+[周月])/.test(stated)) return 'pregnant';
  if(/(?:我|妻子|老婆|爱人|本人).{0,8}(?:哺乳|喂奶)|哺乳期.{0,8}(?:能|可以|吃|喝|怎么办|调理)/.test(stated)) return 'lactating';
  if(/(?:我(?:的)?孩子|宝宝|我(?:的)?儿子|我(?:的)?女儿|小孩)|孩子.{0,12}(?:睡|肚|腹|便|发烧|咳|吃|喝|怎么)|(?:儿童|婴幼儿|未成年).{0,12}(?:能|可以|吃|喝|怎么办|怎么调)|(?:给|为)\d+岁|(?:我是|我今年)(?:[1-9]|1[0-7])岁/.test(stated)) return 'child';
  return denied?'adult':populations.includes(prior)?prior:'adult';
}

function pointKnowledge(text) {
  return /足三里|内关|太溪|穴位|经穴/.test(text) && /哪里|在哪|位置|定位|怎么找|如何找|属于|哪条经/.test(text);
}
function topicOf(text) {
  text=withoutPopulationDenials(text);
  if(pointKnowledge(text))return 'wellness';
  if(/月经|痛经|经期|经前|例假|姨妈|PMS|更年期|孕|妊娠|哺乳/i.test(text)) return 'women';
  if(/压力|焦虑|紧张|减压|情绪|任务堆积|忙不过来/.test(text)) return 'stress';
  if(/疲|乏力|没精神|精力|提不起劲|没力气|力气不太有|累|饿得没劲/.test(text)) return 'fatigue';
  if(/胃|消化|反酸|烧心|腹|肚子|排便|便秘|拉稀|拉不出来|大便(?:偏)?干|憋便|胀气|鼓胀|饭后胀|吃撑/.test(text)) return 'digest';
  if(/睡|失眠|夜[里间].{0,8}醒|晚上.{0,5}醒|早醒|白天.{0,5}困|困意|上床|床上|作息|起床|卧室|吵醒|助眠/.test(text)) return 'sleep';
  if(/八段锦|太极|导引/.test(text)) return 'movement';
  if(/陈皮|中药|药物|丸|胶囊|剂量|用药|处方/.test(text)) return 'medicine';
  if(/放松|呼吸练习|练(?:习)?呼吸|腹式呼吸|鼻吸口呼/.test(text)) return 'stress';
  if(/养生|健康|保健|生活方式|减重|减肥|体重管理|饮食|食物|食品|果汁|食盐|蔬菜|水果|全谷物|主食|粗粮|减盐|久坐|坐一天|运动|步行|走路|骑车|散步|家务|通勤|走.{0,5}分钟|力量训练|健身|活动/.test(text)) return 'wellness';
  return 'general';
}
export function cleanContext(value) {
  if(!value || !INTENTS.includes(value.intent) || !CONTEXT_TOPICS.includes(value.topic)) return null;
  return {intent:value.intent,topic:value.topic,continuation:value.continuation===true,confidence:value.confidence==='high'?'high':'low',population:populations.includes(value.population)?value.population:'adult'};
}
export function resolveContext(turn={},prior=null) {
  const text=turn.quickAnswers?turn.quickAnswers.map(a=>a.answer).join('，'):turn.user || '';
  const careAnswers=Array.isArray(turn.careData?.answers)?turn.careData.answers:[];
  const pregnancyOrLactation=turn.careData?.topic==='women' && careAnswers.some(a=>a.id==='associated' && a.answer==='可能妊娠或正在哺乳');
  // This combined form option cannot distinguish pregnancy from lactation;
  // pregnant is a conservative routing flag, not a diagnosis or confirmed status.
  const population=pregnancyOrLactation?'pregnant':populationOf([text,...careAnswers.map(a=>a.answer)].join('，'),prior?.population);
  if(turn.careData) return {intent:'symptom',topic:turn.careData.topic,continuation:true,confidence:'high',population};
  const topic=topicOf(text);
  const lifestyleChoice=/(?:怎么|怎样|如何|该|要不要|能不能|可以).{0,12}(?:调整|安排|养成|培养|减少|增加|习惯|记录|练|放松)|(?:记录|日记).{0,12}(?:需要|多久|怎么|如何)|(?:早睡|起床|上床|走路|步行|骑车|散步|吃饭|喝水|练呼吸).{0,16}(?:还是|合适|要不要)|躺.{0,4}床.{0,8}吗|(?:每天|日常|平时).{0,8}(?:走.{0,5}分钟|走路|骑车).{0,10}(?:吗|还是)/.test(text);
  let intent='unknown';
  if(turn.quickAnswers) intent='symptom';
  else if(/(?:我|可以|能|该|要).{0,8}(?:吃|服|停|用).{0,8}(?:药|丸|胶囊)|(?:药|丸|胶囊).{0,12}(?:多少|剂量|能吃|能用|停用)/.test(text)) intent='medication';
  else if((knowledge.test(text) || pointKnowledge(text) || (question.test(text) && !lifestyleChoice)) && !personalSymptoms(text)) intent='knowledge';
  else if(symptoms.test(text)) intent='symptom';
  else if(lifestyleChoice) intent='lifestyle';
  else if(topic!=='general' && /[吗呢?？]|还是|该|是不是/.test(text)) intent='knowledge';
  else if(/我想|想(?:学|调整|做)|怎么(?:练|放松)|日常|运动|饮食|调养|八段锦|太极|养生|放松|减压|练习|久坐|走.{0,5}分钟|习惯|作息|起床|上床|躺.{0,4}床|症状记录|经期日记|要注意/.test(text) || (topic!=='general' && /怎么|怎样|如何|先从/.test(text))) intent='lifestyle';
  const referential=/^(?:大约|差不多|已经|最近没有|没有这些|有，我|先试|继续|接着|那|这项|刚才|可以|是的|不是|还没)|结合我|之前|多久|\d+\s*(?:天|周|月|年)/.test(text);
  const continuation=!!prior && intent!=='knowledge' && ((referential && (topic==='general' || topic===prior.topic)) || (intent==='symptom' && topic===prior.topic));
  return {intent:continuation && intent==='unknown'?prior.intent:intent,topic:continuation && topic==='general'?prior.topic:topic,continuation,confidence:intent==='unknown'?'low':'high',population};
}

// Remove explicit denials clause by clause. Contrast words start a new scope.
function affirmedText(text) {
  const symptom='(?:胸痛|胸口(?:痛|疼)|气短|呼吸困难|头痛|呕血|吐血|黑便|腹痛|过敏|晕厥|发麻|喘)';
  return text.replace(new RegExp('(?:没有|并无|并不|不是|不伴|无|不)(?:出现)?(?:明显的?|任何)?'+symptom+'(?:[和或、]'+symptom+')*','g'),'')
    .replace(/(?:没有|并无|无|不想|不会)(?:任何)?(?:自杀|自伤|伤害自己)(?:的)?(?:念头|想法)?/g,'');
}
function cycleTimingKnowledge(text) {
  // Calendar terminology can mention bleeding without reporting an episode.
  // A current/persistent personal report removes this narrow exception.
  if(!/月经|经期|周期/.test(text) || !/第[一1]天|起始日|开始日|计数/.test(text) || !/算|定义|记录|日历/.test(text))return false;
  if(/正常|怎么办|怎么回事|严重|治疗|缓解|处理|止血|疼|痛|头晕|不适/.test(text))return false;
  const report=text.replace(/(?:我|本人)(?:只想|想|希望)(?:知道|了解|弄清楚|确认)/g,'');
  return !/(?:我|她|本人|患者|家人|孩子|现在|今天|昨天|最近|这次|本次|刚才|持续|一直|反复|异常|非经期).{0,14}(?:出血|流血)|(?:出血|流血).{0,10}(?:持续|不止|一直|反复|已经|[一二三四五六七八九十两\d]+天)/.test(report);
}
export function assessInput(raw='') {
  const text=String(raw).replace(/\s/g,'');
  const reported=/(?:我|我爸|我妈|他|她|家人|孩子).{0,5}(?:现在|最近|突然|刚|喘|胸|呼吸|头痛|吐血|呕血|说话|嘴歪|自杀|自伤|伤害自己|不想活)|(?:现在|刚才|今天|突然).{0,12}(?:痛|喘|呼吸|气短|吐血|无力|麻木)/;
  const parts=affirmedText(text).split(/[，,。；;！？!?\n]|但是|然而|可是|但|可(?=刚才|现在|我)/);
  const stated=parts.map(part=>{
    // A historic clause can contain a new, explicit current report without punctuation.
    if(/去年|前年|几年前|曾经|小时候/.test(part) && /现在|目前|今天|刚才|刚刚|此刻/.test(part)) return part.slice(part.search(/现在|目前|今天|刚才|刚刚|此刻/));
    return part;
  }).filter(part=>{
    if(/^(如果|假如|假设)/.test(part)) return false;
    if(/去年|前年|几年前|曾经|小时候/.test(part) && !/现在|目前|今天|刚|此刻/.test(part)) return false;
    if(knowledge.test(part) && !reported.test(part)) return false;
    return true;
  }).join('，');
  const chest=/胸(?:口|部)?.{0,3}(?:痛|疼|闷|压榨)/.test(stated);
  const breath=/喘不(?:过|上)气|呼吸困难|呼吸不了|不能呼吸|喘不上来|憋得.{0,3}厉害/.test(stated);
  const stroke=/突[然发].{0,25}(?:一侧|一边|半边).{0,12}(?:无力|没力气|麻木)|(?:言语|说话).{0,3}(?:不清|含糊)|突然说不清话|嘴歪/.test(stated);
  const bleeding=/吐血|呕血|黑便|黑色柏油样|大量出血/.test(stated);
  const severePain=/(?:腹|肚子|头).{0,12}(?:剧痛|剧烈|痛得厉害|疼得厉害)|突[然发].{0,12}剧烈.{0,5}(?:头|腹)痛/.test(stated);
  const collapse=/叫不醒|昏过去|失去意识|意识不清|昏迷|晕厥/.test(stated);
  const allergy=/(?:喉咙|舌头|嘴唇).{0,4}肿/.test(stated) && /过敏|花生|药|吃了|呼吸|喘/.test(stated);
  const selfHarm=/(?:想|要|准备|打算|打算要|正在)(?:自杀|自伤|伤害自己)|(?:有|出现)(?:自杀|自伤|伤害自己)(?:的)?(?:念头|想法)|不想活(?:了|下去)?|活不下去|想结束生命|(?:刚|已经|刚才).{0,8}(?:吞|吃|服).{0,6}(?:大量|很多|一瓶|过量).{0,6}(?:药|安眠)/.test(stated);
  if(selfHarm) return {risk:'urgent',reason:'self-harm-description'};
  if(breath || stroke || bleeding || severePain || collapse || allergy || (chest && /气短|冷汗|出汗|冒汗|晕|恶心|压榨/.test(stated))) return {risk:'urgent',reason:'high-risk-description'};
  const breathingExercise=/呼吸(?:练习|放松|配合)|(?:练(?:习)?|放松|配合|腹式).{0,6}呼吸|(?:八段锦|导引).{0,15}呼吸/.test(stated);
  const uncertainBreathing=/呼吸/.test(stated) && !breathingExercise;
  const uncertainBleeding=/出血/.test(stated) && !cycleTimingKnowledge(text);
  if(chest || uncertainBreathing || uncertainBleeding || /胸口不舒服|发麻|呼吸.{0,6}(?:异常|不适|费力|急促|停顿|暂停|不畅|不对劲)|气短|过敏|黑色大便/.test(stated)) return {risk:'consult',reason:'risk-needs-assessment'};
  return {risk:'general',reason:'no-rule-hit'};
}

// Deterministic pre-generation gate. Regex rules are an inspectable demo boundary,
// not a clinical classifier; callers must pass known population across turns.
export function routeInput(raw='',context=resolveContext({user:raw})) {
  const text=String(raw).replace(/\s/g,'');
  const population=populationOf(text,context?.population);
  const assessment=assessInput(text);
  if(assessment.risk==='urgent') return {route:'urgent',...assessment,population,answer:assessment.reason==='self-harm-description'?SELF_HARM_ANSWER:URGENT_ANSWER};
  const pureKnowledge=(knowledge.test(text) || (question.test(text) && !symptoms.test(text))) && !personalSymptoms(text) && !/怎么办|怎么调|调理|治疗|缓解|能否|能不能|能吃|能喝|能练|可以.{0,6}(?:吃|喝|练|服|用)|给我|帮我|替我|推荐|适合我/.test(text);
  if(assessment.risk==='consult') return {route:'professional',...assessment,population,answer:PROFESSIONAL_ANSWER};
  if(population!=='adult' && !pureKnowledge) return {route:'professional',risk:'consult',reason:'population-needs-professional',population,answer:PROFESSIONAL_ANSWER};
  if(/(?:针刺|扎针|艾灸|放血).{0,12}(?:深|浅|多久|多长|多少|怎么|如何|操作)|(?:自己|自行|帮我|教我).{0,12}(?:针刺|扎针|艾灸|放血)/.test(text))return {route:'professional',risk:'consult',reason:'procedure-boundary',population,answer:'穴位位置科普不能替代操作培训。针刺、放血或艾灸的部位、深度、时长与适用性应由合格医务人员评估，本草不提供自行操作指令。'};
  const diagnosis=(!pureKnowledge && /辨证|诊断|开方|处方|把脉/.test(text)) || /(?:给我|帮我|替我).{0,12}(?:诊断|辨证|开方|处方|开.{0,4}药)|根据.{0,15}(?:辨证|诊断)|我是不是.{0,12}(?:虚|证|郁)|我.{0,6}(?:什么|哪种).{0,4}(?:体质|证型)|(?:判断|诊断|把脉).{0,6}我|(?:舌|脉象).{0,18}(?:诊断|体质|证型|什么病)|(?:诊断|辨证).{0,10}(?:舌|脉)/.test(text);
  const medicineText=text.replace(/(?:没有|没|未)(?:吃|服|服用|用)(?:任何)?药/g,'');
  const medication=(medicineText===text && (context?.intent==='medication' || context?.topic==='medicine')) || /药|处方|剂量|疗程|相互作用|停用|陈皮|黄芪|人参|华法林|归脾丸|布洛芬|阿莫西林|褪黑素|阿司匹林|对乙酰氨基酚|二甲双胍|降压片|(?:吃|服).{0,6}(?:几|多少)(?:片|粒)|\d+(?:毫克|mg)|(?:服|注射).{0,6}\d+(?:毫升|ml)/i.test(medicineText);
  if(diagnosis || medication) return {route:'professional',risk:'consult',reason:diagnosis?'diagnosis-boundary':'medication-boundary',population,answer:PROFESSIONAL_ANSWER};
  if(/图片|照片|舌图|上传|拍照/.test(text)) return {route:'image',risk:'general',reason:'local-image-only',population,answer:IMAGE_ANSWER};
  return {route:'retrieve',risk:'general',reason:'no-rule-hit',population};
}
export function responseRisk(input,answer='',meta=null,context=resolveContext({user:input})) {
  const pre=assessInput(input).risk;
  const direct=answer.split(/[。！!\n]/).map(s=>s.split(/如果|若|一旦|如有|如出现|除非/)[0]).filter(s=>!/(不需要|无需)/.test(s)).join('。');
  if(pre==='urgent' || meta?.urgent===true || (context.intent!=='knowledge' && /(?:立即|马上|现在|尽快).{0,10}(?:120|急诊|急救)|拨打\s*120/.test(direct))) return 'urgent';
  if(pre==='consult') return 'consult';
  if(!['knowledge','unknown'].includes(context.intent) && (!meta || typeof meta.urgent!=='boolean' || !INTENTS.includes(meta.intent) || !CONTEXT_TOPICS.includes(meta.topic))) return 'consult';
  return 'general';
}
export function nextActions(context,risk,complete=false,answerStatus=null) {
  // Missing evidence is not evidence that this person needs medical care.
  if(answerStatus==='abstained' && risk!=='urgent') return [];
  if(risk!=='general') return ['summary'];
  if(['knowledge','unknown'].includes(context.intent)) return [];
  if(context.intent==='medication') return ['summary'];
  if(context.topic==='movement') return [];
  if(!complete) return context.topic==='sleep'?['intake','guide']:['intake'];
  return context.topic==='sleep'?['guide','checkin']:['checkin','intake'];
}
export const URGENT_ANSWER='你描述的情况可能需要立即处理。**请现在拨打 120 或寻求急诊帮助，不要等待在线问答。** 如果身边有人，请让对方协助，避免自行驾车，也不要先尝试按摩、运动或自行用药来延误求助。这里无法判断具体病因。';
const SELF_HARM_ANSWER='听起来你正承受很大的痛苦。请现在联系一位可信任的人，让对方来陪你，并远离可能伤害自己的物品。若已经受伤、服药过量或担心自己马上会行动，请立即拨打当地急救电话；在中国大陆可拨打 120，有即时人身危险也可拨打 110。你也可以在中国大陆拨打 12356 心理援助热线。请不要独处或等待在线问答，这里无法提供紧急救援。';
const PROFESSIONAL_ANSWER='这类问题需要专业人员结合个人情况评估。这里不能诊断、辨证开方，也不能决定药物剂量、疗程、相互作用或停药。孕期、哺乳期及儿童的健康建议，请咨询相应专科医生；用药问题可同时咨询药师。就诊时可提供症状持续时间、既往病史、过敏史和正在使用的药物。';
const IMAGE_ANSWER='图片只能通过独立的本机查看功能预览，不会上传，也不会发送给模型。本草不提供图片诊断，不能据舌图、面部照片等辨证或判断体质；需要医学判断时请由医生面诊。';

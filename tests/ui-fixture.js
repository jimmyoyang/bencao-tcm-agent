// Local UI fixture only. This is not a real model and is never published.
let fixtureRequests=0,fixtureFailures=0;
const fixtureBadge=document.createElement('output');fixtureBadge.id='fixture-requests';fixtureBadge.textContent='本地模拟请求：0';fixtureBadge.style.cssText='position:fixed;top:2px;right:8px;z-index:100;font-size:9px;background:white';document.addEventListener('DOMContentLoaded',()=>document.body.append(fixtureBadge));
window.PopSDK={model:{async request(payload,{signal}) {
 fixtureBadge.textContent='本地模拟请求：'+(++fixtureRequests)+' · 上下文用户轮数：'+payload.messages.filter(m=>m.role==='user').length;
 const system=payload.messages[0].content;
 const cards=JSON.parse(system.split('以下是本轮唯一可用卡片（最多5条，含边界）：\n')[1]);
 if(location.hash==='#failure' && fixtureFailures++===0)return new Response('',{status:503});
 const selected=cards.slice(0,2);let result={answer:selected.map(c=>c.claim).join('\n'),claims:selected.map(c=>({cardId:c.id,text:c.claim,sourceId:c.sourceId})),risk:'low',nextAction:'none'};
 if(location.hash==='#missing-meta')delete result.risk;
 if(location.hash==='#forged')result.answer+='确诊为脾虚，每天服药三片。<img src=x onerror=alert(1)>';
 if(location.hash==='#urgent-ui')result={answer:'',claims:[],risk:'urgent'};
 const pieces=JSON.stringify(result).match(/[\s\S]{1,30}/g),encoder=new TextEncoder();let timer;
 return new Response(new ReadableStream({start(controller){
  const abort=()=>{clearInterval(timer);controller.error(new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',abort,{once:true});
  timer=setInterval(()=>{if(signal.aborted)return;const piece=pieces.shift();if(piece!==undefined)controller.enqueue(encoder.encode('data: '+JSON.stringify({choices:[{delta:{content:piece}}]})+'\n\n'));else{clearInterval(timer);signal.removeEventListener('abort',abort);controller.enqueue(encoder.encode('data: [DONE]\n\n'));controller.close();}},location.hash==='#slow'?1000:15);
 },cancel(){clearInterval(timer)}}),{headers:{'Content-Type':'text/event-stream'}});
}}};

// Generated pixels only: exercise the real decode/preview handler without
// reading a user's file or changing browser file permissions.
document.addEventListener('DOMContentLoaded',()=>{
 const group=document.createElement('div');group.setAttribute('aria-label','本地合成图片测试');
 for(const [name,brightness] of [['暗图',8],['亮图',252],['平滑图',120],['细节图',null]]) {
  const button=document.createElement('button');button.type='button';button.textContent='测试'+name;
  button.addEventListener('click',()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=800;const ctx=canvas.getContext('2d');
   if(brightness!==null){ctx.fillStyle=`rgb(${brightness},${brightness},${brightness})`;ctx.fillRect(0,0,800,800);}
   else for(let y=0;y<20;y++)for(let x=0;x<20;x++){ctx.fillStyle=(x+y)%2?'#b4b4b4':'#464646';ctx.fillRect(x*40,y*40,40,40);}
   canvas.toBlob(blob=>{const dt=new DataTransfer();dt.items.add(new File([blob],'synthetic-test.png',{type:'image/png'}));const input=document.querySelector('#image-file');input.files=dt.files;input.dispatchEvent(new Event('change'));canvas.width=canvas.height=0;},'image/png');
  });group.append(button);
 }
 document.querySelector('#image-dialog form').append(group);
});

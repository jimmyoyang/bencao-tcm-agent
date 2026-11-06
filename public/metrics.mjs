import {dataEpoch,writeInEpoch} from './history.mjs';
const KEY='bencao.metrics.v1';
const EVENTS=['queries','retrievalAttempts','retrievalHits','groundedAnswers','abstentions','citationClicks','corrections','riskBlocks','modelFailures'];
const empty=()=>({enabled:false,counts:Object.fromEntries(EVENTS.map(key=>[key,0]))});
export function readMetrics(storage) {
  try {const raw=JSON.parse(storage.getItem(KEY));if(raw?.epoch!==dataEpoch(storage)||raw?.enabled!==true)return empty();return {enabled:true,counts:Object.fromEntries(EVENTS.map(key=>[key,Number.isSafeInteger(raw.counts?.[key]) && raw.counts[key]>0?raw.counts[key]:0]))};}catch{return empty();}
}
export function setMetricsConsent(storage,enabled,epoch) {
  if(!enabled){storage.removeItem(KEY);return;}
  writeInEpoch(storage,KEY,{...readMetrics(storage),enabled:true,epoch},epoch);
}
export function recordMetric(storage,event,epoch) {
  if(!EVENTS.includes(event) || dataEpoch(storage)!==epoch)return;
  const value=readMetrics(storage);if(!value.enabled)return;
  value.counts[event]++;
  try{writeInEpoch(storage,KEY,{...value,epoch},epoch);}catch{/* Optional counts must never interfere with health-information or privacy flows. */}
}

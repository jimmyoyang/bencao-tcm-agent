import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

test('审核表与来源门禁分层，结论边界改变后必须重新人工审核',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bencao-review-test-'));
  const build=()=>execFileSync(process.execPath,[fileURLToPath(new URL('../tools/build-knowledge.mjs',import.meta.url))],{cwd:dir});
  const reviewPath=join(dir,'docs/review/citation-human-review.json');
  try {
    await cp(new URL('../data',import.meta.url),join(dir,'data'),{recursive:true});build();
    let rows=JSON.parse(await readFile(reviewPath,'utf8'));
    assert.equal(rows.length,80);
    assert.ok(rows[0].contraindication);
    assert.ok(rows[0].populations.includes('adult'));
    assert.equal(rows[0].knowledgeType,'general-health');
    assert.equal(rows[0].reviewStatus,'pending');
    const sourcePath=join(dir,'docs/review/source-human-review.json');
    let sources=JSON.parse(await readFile(sourcePath,'utf8'));
    assert.equal(sources.length,19);
    assert.equal(sources[0].sourceFreshnessVerdict,'stale');
    assert.equal(sources[0].sourceReviewStatus,'pending');
    rows[0].humanReviewer='Synthetic test reviewer';rows[0].humanReviewDate='2026-11-05';rows[0].reviewerRole='medical-editor';rows[0].reviewStatus='accepted';rows[0].humanVerdict='accepted';rows[0].citationVerdict='accepted';rows[0].safetyVerdict='accepted';
    sources[0].sourceFreshnessVerdict='current';sources[0].sourceSnapshotHash='sha256:synthetic';sources[0].sourceReviewStatus='accepted';sources[0].reviewerRole='medical-editor';sources[0].humanReviewer='Synthetic test reviewer';sources[0].humanReviewDate='2026-11-05';
    await writeFile(reviewPath,JSON.stringify(rows));build();
    await writeFile(sourcePath,JSON.stringify(sources));build();
    assert.equal(JSON.parse(await readFile(reviewPath,'utf8'))[0].humanVerdict,'accepted');
    assert.equal(JSON.parse(await readFile(sourcePath,'utf8'))[0].sourceReviewStatus,'accepted');
    assert.equal(JSON.parse(await readFile(join(dir,'public/knowledge/verified-index.json'),'utf8')).status,'blocked');
    const cardPath=join(dir,'data/rag-a-cards.jsonl');
    const cards=(await readFile(cardPath,'utf8')).trim().split('\n').map(JSON.parse);
    cards[0].supportScope+=' Changed scope for regression test.';
    await writeFile(cardPath,cards.map(c=>JSON.stringify(c)).join('\n')+'\n');build();
    rows=JSON.parse(await readFile(reviewPath,'utf8'));
    assert.equal(rows[0].humanVerdict,'pending');assert.equal(rows[0].humanReviewer,null);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('审核状态和问题编码使用固定枚举',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bencao-review-schema-test-'));
  const build=()=>execFileSync(process.execPath,[fileURLToPath(new URL('../tools/build-knowledge.mjs',import.meta.url))],{cwd:dir,stdio:['ignore','ignore','pipe']});
  try {
    await cp(new URL('../data',import.meta.url),join(dir,'data'),{recursive:true});build();
    const reviewPath=join(dir,'docs/review/citation-human-review.json');
    const rows=JSON.parse(await readFile(reviewPath,'utf8'));rows[0].issueCodes=['unknown-code'];
    await writeFile(reviewPath,JSON.stringify(rows));
    assert.throws(build,/INVALID_CARD_REVIEW/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

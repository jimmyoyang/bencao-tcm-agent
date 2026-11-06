import test from 'node:test';
import assert from 'node:assert/strict';
import * as image from '../public/image.mjs';

function sample(pixel,width=64,height=64) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(pixel(x,y),(y*width+x)*4);
  return {data,width,height};
}
test('本机像素提示曝光与细节问题，不把无警告说成诊断可用',()=>{
  assert.equal(typeof image.pixelQuality,'function');
  const dark=image.pixelQuality(sample(()=>[8,8,8,255]));
  assert.ok(dark.flags.includes('dark'));
  const bright=image.pixelQuality(sample(()=>[252,252,252,255]));
  assert.ok(bright.flags.includes('bright'));
  const smooth=image.pixelQuality(sample((x)=>[120+x/4,120+x/4,120+x/4,255]));
  assert.ok(smooth.flags.includes('low-detail'));
  const detailed=image.pixelQuality(sample((x,y)=>{const n=(x%8<4)!==(y%8<4)?180:70;return [n,n,n,255]}));
  assert.deepEqual(detailed.flags,[]);
  const result=image.imageQuality({type:'image/png',size:2048,width:800,height:800,sample:sample(()=>[8,8,8,255])});
  assert.match(result.message,/偏暗/);
  assert.match(result.message,/不能.*诊断/);
});
test('透明或缺少像素时报告无法可靠检查，不能生成正常结论',()=>{
  assert.equal(typeof image.pixelQuality,'function');
  assert.equal(image.pixelQuality({width:64,height:64,data:new Uint8ClampedArray(8)}).checked,false);
  assert.equal(image.pixelQuality(sample(()=>[0,0,0,0])).checked,false);
  assert.equal(image.pixelQuality({width:0,height:0,data:[]}).checked,false);
  assert.match(image.imageQuality({type:'image/png',size:2,width:800,height:800,sample:sample(()=>[0,0,0,0])}).message,/无法可靠/);
});

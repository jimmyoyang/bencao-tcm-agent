// Heuristic photo checks, not a clinical quality or tongue-image classifier.
// Use a small local sample; no pixels or scores are stored or transmitted.
export function pixelQuality({data,width,height}={}) {
  const total=width*height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||total>256*256||data?.length!==total*4)return {checked:false,flags:[]};
  const gray=new Float32Array(total);let sum=0,dark=0,bright=0,opaque=0;
  for(let i=0;i<total;i++) {
    if(data[i*4+3]<250)continue;
    opaque++;const n=.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2];
    gray[i]=n;sum+=n;if(n<25)dark++;if(n>245)bright++;
  }
  if(opaque<total*.95)return {checked:false,flags:[]};
  let lap=0,lapSquared=0,count=0;
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++) {
    const i=y*width+x,n=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width];
    lap+=n;lapSquared+=n*n;count++;
  }
  const mean=sum/opaque,detail=lapSquared/count-(lap/count)**2,flags=[];
  if(mean<45||dark/opaque>.65)flags.push('dark');
  if(mean>235||bright/opaque>.65)flags.push('bright');
  if(detail<40)flags.push('low-detail');
  return {checked:true,flags};
}
export function imageQuality({type,size,width,height,sample}) {
  if(!['image/jpeg','image/png','image/webp'].includes(type))return {ok:false,message:'请选择 JPG、PNG 或 WebP 图片。'};
  if(size>8*1024*1024)return {ok:false,message:'图片超过 8 MB，请先缩小文件。'};
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return {ok:false,message:'无法读取这张图片，请换一张。'};
  const notes=[];
  if(Math.min(width,height)<600)notes.push('图片分辨率较低，建议重新拍摄。');
  const quality=pixelQuality(sample);
  if(!quality.checked)notes.push('无法可靠检查这张图的曝光与细节，请自行核对对焦和光线。');
  else {
    if(quality.flags.includes('dark'))notes.push('画面可能偏暗，试着移到均匀的自然光下。');
    if(quality.flags.includes('bright'))notes.push('画面可能过亮，避开直射光和闪光灯。');
    if(quality.flags.includes('low-detail'))notes.push('可辨细节较少，可能失焦，也可能画面本身平整；请放大检查。');
    if(!quality.flags.length)notes.push('未发现明显的曝光或细节问题，仍请自行核对对焦和光线。');
  }
  notes.push('以上只是拍摄提示，不能验证颜色真实性，也不能据此诊断舌象。');
  return {ok:true,message:notes.join(' ')};
}

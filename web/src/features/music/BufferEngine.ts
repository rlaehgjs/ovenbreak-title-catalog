// A single AudioContext survives route changes. Repetition is handled by the audio clock.
// Assets are native FMOD renders: [0, loopStart) plays once (intro), then [loopStart, loopEnd) repeats
// sample-exactly via AudioBufferSourceNode.loopStart/loopEnd. Never trim silence or crossfade samples.
export type LoopRange = {start:number;end:number}
// "끝까지 재생" (song mode): the same render up to `at` frames, followed by a separately rendered ending
// (FMOD LOOP_OFF output from that frame on, sample-identical prefix). Joined by copying samples, never blended.
export type Ending = {at:number;url?:string}
// Decoded PCM is float32; long intro+cycle renders can be large, so the cache is bounded by memory, not count.
export const cacheBudgetBytes=256*1024*1024
const bytesOf=(b:AudioBuffer)=>b.length*b.numberOfChannels*4
export class BufferEngine {
 private context:AudioContext|null=null
 private gain:GainNode|null=null
 private source:AudioBufferSourceNode|null=null
 private cache=new Map<string,AudioBuffer>()
 private buffer:AudioBuffer|null=null
 private startAt=0
 private offset=0
 private token=0
 private loop=false
 private loopStart=0
 private loopEnd=0
 private volume=.5
 playing=false
 loading=false
 duration=0
 error=''
 onEnd:()=>void=()=>{}
 private ensure(){if(!this.context){this.context=new AudioContext({sampleRate:48000});this.gain=this.context.createGain();this.gain.gain.value=this.volume;this.gain.connect(this.context.destination)}return this.context}
 position(){if(!this.playing||!this.context)return this.offset;const t=this.offset+this.context.currentTime-this.startAt;return this.loop&&t>=this.loopEnd&&this.loopEnd>this.loopStart?this.loopStart+(t-this.loopStart)%(this.loopEnd-this.loopStart):Math.min(t,this.duration)}
 private stopSource(){if(this.source){this.source.onended=null;this.source.stop();this.source.disconnect();this.source=null}this.playing=false}
 pause(){this.offset=this.position();++this.token;this.loading=false;this.stopSource()}
 setVolume(v:number){this.volume=v;if(this.gain&&this.context)this.gain.gain.setTargetAtTime(v,this.context.currentTime,.015)}
 // Changing the loop flag keeps the current position; the running source keeps its loop points.
 setLoop(v:boolean){const pos=this.position();this.offset=pos;if(this.context)this.startAt=this.context.currentTime;this.loop=v;if(this.source)this.source.loop=v}
 private remember(url:string,buffer:AudioBuffer){
  this.cache.delete(url);this.cache.set(url,buffer)
  let total=0;for(const b of this.cache.values())total+=bytesOf(b)
  for(const [key,b] of this.cache){if(total<=cacheBudgetBytes||key===url)break;this.cache.delete(key);total-=bytesOf(b)}
 }
 private async load(url:string,token:number){
  let b=this.cache.get(url)
  if(!b){const response=await fetch(url);if(!response.ok)throw Error('audio fetch');b=await this.ensure().decodeAudioData(await response.arrayBuffer());if(token!==this.token)return null}
  this.remember(url,b);return b
 }
 async play(url:string,position:number,range?:LoopRange|null,ending?:Ending|null){
  this.pause();const token=++this.token;this.loading=true;this.error=''
  try{
   const ctx=this.ensure();await ctx.resume();if(token!==this.token)return
   let original=await this.load(url,token);if(!original)return
   if(ending){
    const key=`${url}#${ending.at}#${ending.url||''}`;let joined=this.cache.get(key)
    if(!joined){
     const tail=ending.url?await this.load(ending.url,token):null;if(ending.url&&!tail)return
     const head=Math.max(0,Math.min(ending.at,original.length)),length=head+(tail?.length||0)
     joined=ctx.createBuffer(original.numberOfChannels,length,original.sampleRate)
     for(let c=0;c<original.numberOfChannels;c++){const out=joined.getChannelData(c);out.set(original.getChannelData(c).subarray(0,head));if(tail)out.set(tail.getChannelData(Math.min(c,tail.numberOfChannels-1)),head)}
    }
    this.remember(key,joined);original=joined
   }
   if(token!==this.token)return
   this.duration=original.duration;this.buffer=original
   // Without a game loop range (one-shot tracks) the whole file repeats when the listener asks for repeat.
   const start=range?Math.max(0,Math.min(range.start,this.duration)):0,end=range?Math.max(start,Math.min(range.end,this.duration)):this.duration
   this.loopStart=end>start?start:0;this.loopEnd=end>start?end:this.duration
   this.offset=Math.max(0,Math.min(position,this.duration));if(this.offset>=this.duration)this.offset=0
   this.startSource();this.loading=false
  }catch(e){if(token!==this.token)return;this.loading=false;this.playing=false;this.error=e instanceof DOMException&&e.name==='NotAllowedError'?'재생 버튼을 다시 눌러 브라우저의 오디오를 허용해 주세요.':'음원을 불러오지 못했습니다. 재생을 다시 누르거나 다른 곡을 선택해 주세요.'}
 }
 private startSource(){const ctx=this.ensure();if(!this.buffer)return;const source=ctx.createBufferSource();source.buffer=this.buffer;source.loop=this.loop;source.loopStart=this.loopStart;source.loopEnd=this.loopEnd;source.connect(this.gain!);source.onended=()=>{if(this.source!==source)return;source.disconnect();this.source=null;this.playing=false;this.offset=this.duration;this.onEnd()};this.source=source;this.startAt=ctx.currentTime;this.playing=true;source.start(0,this.offset)}
 seek(value:number){const playing=this.playing;this.offset=Math.max(0,Math.min(value,this.duration));this.stopSource();if(playing){if(this.offset>=this.duration)this.offset=Math.max(0,this.duration-.001);this.startSource()}}
 close(){this.pause();void this.context?.close();this.context=null;this.gain=null;this.buffer=null;this.cache.clear()}
}

import {strict as assert} from 'node:assert';
import {sanitize,defaults,queueFor,takeNext,storageKey,mapPosition} from '../src/features/music/model.ts';
import {BufferEngine,AudioFetchError,audioErrorText} from '../src/features/music/BufferEngine.ts';
const ids=['a','b','c'];
assert.equal(storageKey,'ovenbreak-music-settings-v1');
assert.deepEqual(sanitize(null,ids),defaults(ids));
const s=sanitize({version:1,volume:7,position:-4,repeat:'invalid',active:'missing',favorites:['a','a','gone'],playlists:[{id:'list-1',name:'test',tracks:['c','a','gone']}]},ids);
assert.equal(s.volume,1);assert.equal(s.position,0);assert.equal(s.repeat,'off');assert.deepEqual(s.favorites,['a']);assert.equal(s.active,'all');
assert.deepEqual(queueFor({...s,active:'list-1'},ids),['c','a']);
assert.deepEqual(sanitize(JSON.parse(JSON.stringify({...s,repeat:'all',shuffle:true,position:4})),ids),{...s,repeat:'all',shuffle:true,position:4});
assert.equal(takeNext(ids,'c',false,'off',[],false).next,undefined);
assert.equal(takeNext(ids,'c',false,'all',[],false).next,'a');
let step=takeNext(ids,'a',true,'off',[],false,()=>.1);const second=step.next;assert.notEqual(second,'a');
step=takeNext(ids,second,true,'off',step.remaining,step.started,()=>.1);assert.notEqual(step.next,second);assert.notEqual(step.next,'a');
assert.equal(takeNext(ids,step.next,true,'off',step.remaining,true).next,undefined);
assert.notEqual(takeNext(ids,step.next,true,'all',[],true,()=>.1).next,step.next);
assert.equal(takeNext([],'a',true,'all',[],false).next,undefined);
// Play mode was added to existing v1 records: missing/unknown → 'game' (previous behaviour), 'song' round-trips.
assert.equal(sanitize({version:1,volume:.3},ids).mode,'game');assert.equal(sanitize({version:1,mode:'bogus'},ids).mode,'game');
assert.equal(sanitize(JSON.parse(JSON.stringify({...s,mode:'song'})),ids).mode,'song');
// Mode switch keeps the musical moment: first pass identical, later loop cycles fold back, song ending → loop start.
const lp={start:2,end:10};assert.equal(mapPosition(5,'song',9,lp),5);assert.equal(mapPosition(9.5,'song',9,lp),1.5);assert.equal(mapPosition(25,'song',9,lp),1);
assert.equal(mapPosition(5,'game',9,lp),5);assert.equal(mapPosition(9.2,'game',9,lp),2);
// Merged songs: old ids (other names, former per-setting track ids) map to the song; a former variant id becomes the chosen version.
{const cat={alias:{old:'a','a@x':'a'},versions:{a:['a','a@x','old'],b:['b']}};
 const m=sanitize({version:1,trackId:'a@x',favorites:['old','b','old'],playlists:[{id:'list-1',name:'n',tracks:['a@x','c']}],versions:{b:'b',c:'zz',a:'nope'}},ids,cat);
 assert.equal(m.trackId,'a');assert.deepEqual(m.favorites,['a','b']);assert.deepEqual(m.playlists[0].tracks,['a','c']);assert.deepEqual(m.versions,{b:'b',a:'a@x'});
 assert.deepEqual(sanitize({version:1,trackId:'b'},ids,cat).versions,{},'no version chosen → default');}
console.log('PASS: settings round-trip, validation, queues, shuffle exhaustion and repeat policies');
class Buffer{constructor(channels,length,rate){this.numberOfChannels=channels;this.length=length;this.sampleRate=rate;this.duration=length/rate;this.channels=Array.from({length:channels},()=>Float32Array.from({length},(_,i)=>Math.sin(i/5)))}getChannelData(c){return this.channels[c]}}
let contexts=0,sources=0,fetches=0;const instances=[];
class Context{currentTime=0;destination={};constructor(){contexts++;instances.push(this)}async resume(){}createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){}}}async decodeAudioData(){return new Buffer(2,1000,1000)}createBuffer(c,n,r){return new Buffer(c,n,r)}createBufferSource(){sources++;const s={connect(){},disconnect(){},stop(){},start(when,offset){this.offset=offset},onended:null};this.last=s;return s}async close(){}}
globalThis.AudioContext=Context;globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}};
const engine=new BufferEngine;engine.setLoop(true);await engine.play('/a.wav',0);
assert.equal(contexts,1);assert.equal(sources,1);assert.equal(instances[0].last.loop,true);
const ctx=instances[0],source=ctx.last;ctx.currentTime=10.2;const pos=engine.position();assert(Math.abs(pos-.2)<1e-9);assert.equal(sources,1,'loop must not recreate source or refetch');assert.equal(fetches,1);
const buffer=source.buffer.getChannelData(0);assert(Math.abs(buffer[999]-Math.sin(999/5))<1e-6,'native samples must not be blended');assert.equal(source.loopStart,0);assert.equal(source.loopEnd,1);
engine.pause();const at=engine.position();ctx.currentTime=20;assert.equal(engine.position(),at);await engine.play('/a.wav',at);assert.equal(contexts,1);assert.equal(fetches,1,'resume uses decoded cache');
engine.setLoop(false);assert.equal(ctx.last.loop,false);engine.seek(.5);assert.equal(engine.position(),.5);engine.pause();engine.seek(.25);assert.equal(engine.position(),.25);assert.equal(engine.playing,false);
engine.close();console.log('PASS: one context, native loop without reload, unmodified native samples, pause/seek and decoded cache');
// Cancel an old request while selecting a new track.
let release;globalThis.fetch=url=>url==='/slow'?new Promise(resolve=>{release=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})}):Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
const race=new BufferEngine;const slow=race.play('/slow',0);await new Promise(r=>setTimeout(r,0));await race.play('/fast',.4);release();await slow;assert.equal(race.position(),.4);assert.equal(race.playing,true);race.close();
console.log('PASS: stale loading completion cannot replace newer playback');
Context.prototype.decodeAudioData=async function(){const b=new Buffer(2,1000,1000);for(const c of b.channels)c.fill(0,980);return b};
const trimmed=new BufferEngine;trimmed.setLoop(true);await trimmed.play('/silence.wav',0);assert.equal(trimmed.duration,1);assert.equal(instances.at(-1).last.loopEnd,1);trimmed.close();
console.log('PASS: intentional silence is preserved; no amplitude-based trimming');

// Game section loop: intro [0, loopStart) once, then [loopStart, loopEnd) repeats on the audio clock.
Context.prototype.decodeAudioData=async function(){return new Buffer(2,1000,1000)};
const section=new BufferEngine;section.setLoop(true);await section.play('/section.flac',0,{start:.25,end:1});
const sctx=instances.at(-1),ssrc=sctx.last;assert.equal(ssrc.loop,true);assert.equal(ssrc.loopStart,.25);assert.equal(ssrc.loopEnd,1);
sctx.currentTime=1.5;assert(Math.abs(section.position()-.75)<1e-9,'position wraps inside the loop section, not to 0');
sctx.currentTime=1;assert(Math.abs(section.position()-.25)<1e-9);
section.pause();await section.play('/section.flac',.9,{start:.25,end:1});assert.equal(sctx.last.offset,.9);assert.equal(sctx.last.loopStart,.25);
await section.play('/section.flac',0,null);assert.equal(sctx.last.loopStart,0);assert.equal(sctx.last.loopEnd,1,'one-shot tracks repeat whole file only on request');
section.close();console.log('PASS: section loop (loopStart/loopEnd), position wrap, resume inside loop and one-shot fallback');

// Decoded cache is bounded by memory; the current buffer always stays.
const {cacheBudgetBytes}=await import('../src/features/music/BufferEngine.ts');
const big=Math.ceil(cacheBudgetBytes/8/3)+1;Context.prototype.decodeAudioData=async function(){return {numberOfChannels:2,length:big,sampleRate:48000,duration:big/48000,getChannelData(){return new Float32Array(0)}}};
fetches=0;globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}};const cached=new BufferEngine;for(const u of ['/1','/2','/3','/1'])await cached.play(u,0);assert.equal(fetches,4,'oldest decoded buffer is evicted past the budget');await cached.play('/1',0);assert.equal(fetches,4,'current buffer stays cached');cached.close();
console.log('PASS: decoded cache stays within memory budget');

// Track catalog must match native FMOD render boundaries.
// 음악 서버 한도 초과(네트워크 오류·429·5xx)는 하루 제공량 안내, 오프라인은 연결 안내
assert.match(audioErrorText(new AudioFetchError('unavailable')),/오전 9시/);assert.match(audioErrorText(new AudioFetchError('offline')),/인터넷 연결/);assert.match(audioErrorText(new Error('decode')),/불러오지 못했습니다/);
{const realFetch=globalThis.fetch;const q=new BufferEngine;globalThis.fetch=async()=>({ok:false,status:429});await q.play('/quota.flac',0);assert.match(q.error,/오전 9시/);
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};await q.play('/cors.flac',0);assert.match(q.error,/오전 9시/);q.close();globalThis.fetch=realFetch}
console.log('PASS: quota/network failures show the daily-limit message');
const {readFileSync,existsSync}=await import('node:fs');
const songs=JSON.parse(readFileSync(new URL('../src/features/music/tracks.json',import.meta.url),'utf8'));
// Songs merge identical music (same MIDI / same notes); each version is one distinct game setting and one render.
assert.equal(new Set(songs.map(s=>s.id)).size,songs.length,'unique song ids');
const aliasOf=new Map(songs.flatMap(s=>(s.aliases||[]).map(a=>[a,s.id])));for(const a of aliasOf.keys())assert(!songs.some(s=>s.id===a),'alias must not shadow a song id');
for(const s of songs){assert(s.versions.length>0);assert.equal(new Set(s.versions.map(v=>v.src)).size,s.versions.length,'identical renders are merged');for(const v of s.versions){assert(v.summary&&Array.isArray(v.uses)&&v.uses.length);if(v.key!==s.id)assert.equal(aliasOf.get(v.key),s.id,'every version key resolves to its song')}}
const tracks=songs.flatMap(s=>s.versions.map(v=>({...v,id:v.key})));
const streaminfo=b=>{assert.equal(b.toString('ascii',0,4),'fLaC');const x=b.readBigUInt64BE(18);return {rate:Number(x>>44n),channels:Number((x>>41n)&7n)+1,bits:Number((x>>36n)&31n)+1,frames:Number(x&((1n<<36n)-1n))}};
assert.equal(new Set(tracks.map(t=>t.id)).size,tracks.length,'unique ids');
for(const t of tracks){
 assert(Number.isInteger(t.frames)&&t.frames>0);
 if(t.loopEndFrame!==null){assert(Number.isInteger(t.loopStartFrame)&&t.loopStartFrame>=0&&t.loopStartFrame<t.loopEndFrame);assert.equal(t.loopEndFrame,t.frames,'file ends exactly at loop end')}
 else{assert.equal(t.loopStartFrame,null);assert.equal(t.loopEndFrame,null)}
}
const bundled=tracks.filter(t=>t.bundled);assert.deepEqual(bundled.map(t=>t.id),['bgm_bonus_ovenbreak_01','bgm_bonus_ovenbreak_02','bgm_bonus_ovenbreak_03']);
for(const t of bundled){const s=streaminfo(readFileSync(new URL('../public/audio/'+t.src.split('?')[0],import.meta.url)));assert.deepEqual(s,{rate:48000,channels:2,bits:16,frames:t.frames});assert.equal(t.loopStartFrame,0);assert.equal(t.loopEndFrame,504337)}
// 분류: 모든 곡이 정해진 7개 분류 중 하나
{const {CATEGORIES}=await import('./bgm-category.mjs');for(const s of songs)assert(CATEGORIES.includes(s.category),`bad category ${s.id}: ${s.category}`);
 console.log(`PASS: every song has a category (${CATEGORIES.map(c=>c+' '+songs.filter(s=>s.category===c).length).join(', ')})`)}
// 속도 옵션: speed가 있으면 1이 아닌 양수이고 요약의 '속도 N배'와 같음, 합친(사실상 같은 소리) 버전 키는 곡 별칭으로만 남음
{let speedSongs=0;for(const s of songs){for(const v of s.versions){if(v.speed!==undefined){assert(v.speed>0&&v.speed!==1,`bad speed ${v.key}`);const m=/속도 ([\d.]+)배/.exec(v.summary);assert(m&&Math.abs(Number(m[1])-v.speed)<1e-3,`speed/summary mismatch ${v.key}`)}}if(new Set(s.versions.map(v=>v.speed??1)).size>1)speedSongs++}
 const near=JSON.parse(readFileSync(new URL('../../analysis/bgm-render/near-identical.json',import.meta.url),'utf8')).versions;
 for(const n of near){assert(!tracks.some(t=>t.key===n.key),`near-identical ${n.key} must be merged`);assert.equal(aliasOf.get(n.key),songs.find(s=>s.versions.some(v=>v.key===n.into)).id)}
 console.log(`PASS: speed option metadata (${speedSongs} songs with several speeds); ${near.length} practically identical versions merged into their representative`)}
console.log(`PASS: ${songs.length} songs / ${tracks.length} versions have valid loop metadata; bundled test FLAC boundaries match (504,337 frames)`);
const local=new URL('../../analysis/bgm-render/out/flac/',import.meta.url);
if(existsSync(local)){let n=0;for(const t of tracks){const s=streaminfo(readFileSync(new URL(t.src.split('?')[0],local)));assert.equal(s.frames,t.frames,t.id);assert.equal(s.rate,48000);n++}console.log(`PASS: all ${n} local FLAC renders match catalog frame counts`)}
else console.log('SKIP: local FLAC renders not present');

// Song mode ("끝까지 재생"): render[0:endFrame] + ending render, joined by copying samples (no blending, no loop range).
{
 Context.prototype.decodeAudioData=async function(ab){const n=ab.byteLength||1000,b=new Buffer(2,n,1000);if(n===300)for(const c of b.channels)c.forEach((_,i)=>c[i]=10+i);return b};
 globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(url==='/end'?300:0)});
 const song=new BufferEngine;await song.play('/main',0,null,{at:600,url:'/end'});
 const sctx=instances.at(-1),src=sctx.last,d=src.buffer.getChannelData(1);
 assert.equal(src.buffer.length,900);assert.equal(song.duration,.9);assert.equal(src.loop,false);assert.equal(src.loopStart,0);assert.equal(src.loopEnd,.9);
 assert(Math.abs(d[599]-Math.sin(599/5))<1e-6,'prefix is the loop render');assert.equal(d[600],10);assert.equal(d[899],309,'ending copied unchanged');
 song.setLoop(true);assert.equal(sctx.last.loop,true,'repeat-one in song mode repeats the whole song');
 await song.play('/main',0,null,{at:600});assert.equal(sctx.last.buffer.length,600,'no ending file → cut at end frame');
 await song.play('/main',0,{start:.25,end:1});assert.equal(sctx.last.buffer.length,1000,'game mode still uses the untouched render');assert.equal(sctx.last.loopStart,.25);
 song.close();console.log('PASS: song mode joins render prefix + ending sample-exactly; game mode unchanged');
}
// Endings in the catalog must match their FLACs.
{
 let n=0;for(const t of tracks){if(t.loopEndFrame===null){assert.equal(t.endFrame,undefined);continue}
  assert(Number.isInteger(t.endFrame)&&t.endFrame>0&&t.endFrame<=t.frames,t.id);if(t.ending){assert(Number.isInteger(t.endingFrames)&&t.endingFrames>0);n++}}
 for(const t of bundled){assert(t.ending,t.id);const s=streaminfo(readFileSync(new URL('../public/audio/'+t.ending.split('?')[0],import.meta.url)));assert.equal(s.frames,t.endingFrames)}
 if(existsSync(local)){for(const t of tracks)if(t.ending){const s=streaminfo(readFileSync(new URL(t.ending.split('?')[0],local)));assert.equal(s.frames,t.endingFrames,t.id);assert.equal(s.rate,48000)}console.log(`PASS: ${n} ending FLACs match catalog frame counts (local + bundled)`)}
 else console.log(`PASS: ${n} tracks have valid ending metadata; bundled ending FLACs match`)
}

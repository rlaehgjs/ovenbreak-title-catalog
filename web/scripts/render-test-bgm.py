"""Render complete local test MIDI loops with the observed game's FMOD fallback.
No amplitude-based trimming/crossfade. Requires local FMOD 2.03.07 and game DLS.
The three audited tracks only; do not apply fallback to unaudited custom loops.
"""
import sys,os,json,wave,hashlib,tempfile
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'bgm-player'))
from fmod_backend import FmodPlayer
hashes=['4a89c717701fe03cfd8d188e309d084ac3b473c7700301b04aa866b5c98ecab2','2fd515566681f7f4875c696a0cbe0e990f8f14c1e65c64ae3c3b46153c02e13b','486638e58b73a015de0d8a845073f60a06d705edae81d1924fd143053bf6d162']
assert hashlib.sha256((root/'analysis/recovered-audio/soundbank.dls').read_bytes()).hexdigest()=='522d84966815adec1fce6edc79600ae6b18ef87a5ed043eb818da72c717f3d09','DLS changed: re-audit before rendering'
assert hashlib.sha256((root/'analysis/bgm-loop-audit/bgms.dxc').read_bytes()).hexdigest()=='d92b985607dd838a6793284ecc3d63718cb52e62d80fe04bd8eeb59b91242f1c','BGM config changed: re-audit loop/speed/DSP before rendering'
out=root/'web/public/audio';out.mkdir(exist_ok=True)
tracks=[];report=[]
with tempfile.TemporaryDirectory(prefix='bgm-loop-') as temporary:
 os.chdir(temporary)
 for i,midi_hash in enumerate(hashes,1):
  name=f'bgm_bonus_ovenbreak_{i:02}';midi=root/'analysis/recovered-audio/midi'/f'{name}.mid'
  assert hashlib.sha256(midi.read_bytes()).hexdigest()==midi_hash,'MIDI changed: re-audit before rendering'
  player=FmodPlayer(output=5,init_flags=3)
  try:
   assert player.version==0x20307,'FMOD version must match audited version'
   player.play(midi,loop=True,game_loop=True)
   end_ms=player.duration_ms();assert end_ms==10507
   # FMOD millisecond loop endpoint is inclusive, verified against native periods.
   rate=48000;frames=end_ms*rate//1000+1
   for _ in range((frames*3+511)//512):player.update()
  finally:player.close()
  with wave.open('fmodoutput.wav') as w:
   assert (w.getframerate(),w.getnchannels(),w.getsampwidth())==(rate,2,2)
   audio=w.readframes(w.getnframes())
  assert len(audio)>=frames*3*4
  first=np.frombuffer(audio[:frames*4],dtype='<i2').astype(np.int32)
  second=np.frombuffer(audio[frames*4:frames*8],dtype='<i2').astype(np.int32)
  delta=np.abs(first-second);assert delta.max()<=1 and np.count_nonzero(delta)<100,'Native repeat differs: investigate before export'
  pcm=audio[:frames*4];sha=hashlib.sha256(pcm).hexdigest()
  with wave.open(f'{name}.wav','wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm)
  tracks.append({'id':name,'title':name,'src':f'audio/{name}.wav?v={sha[:12]}','duration':frames/rate,'sampleRate':rate,'loopFrames':frames})
  report.append({'id':name,'midiSha256':midi_hash,'pcmSha256':sha,'loopEndMs':end_ms,'loopFrames':frames,'nativeCycleMaxDelta':int(delta.max()),'differentSamples':int(np.count_nonzero(delta))})
 for track in tracks:(Path(temporary)/(track['id']+'.wav')).replace(out/(track['id']+'.wav'))
 os.chdir(root)
(root/'web/src/features/music/tracks.json').write_text(json.dumps(tracks,indent=2),encoding='utf8')
(root/'analysis/bgm-loop-audit/local-render.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))

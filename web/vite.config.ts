import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
// Dev only: serve locally rendered FLACs (too large for the bundle) at /bgm-local/ when BGM_LOCAL_DIR is set.
// Use with VITE_BGM_BASE=/bgm-local/ . Production audio comes from VITE_BGM_BASE (external storage).
function localBgm():Plugin{
 const dir=process.env.BGM_LOCAL_DIR&&resolve(process.env.BGM_LOCAL_DIR)
 return {name:'local-bgm',apply:'serve',configureServer(server){if(!dir)return;server.middlewares.use('/bgm-local/',(req,res,next)=>{
  const name=decodeURIComponent((req.url||'').split('?')[0]).replace(/^\/+/,''),file=normalize(join(dir,name))
  if(!file.startsWith(dir)||!name.endsWith('.flac')||!existsSync(file))return next()
  res.setHeader('Content-Type','audio/flac');res.setHeader('Content-Length',String(statSync(file).size));createReadStream(file).pipe(res)})}}
}
export default defineConfig({
 plugins: [react(), localBgm()],
 base: '/ovenbreak-title-catalog/',
 server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { strict: true, allow: ['.'] } },
 preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})

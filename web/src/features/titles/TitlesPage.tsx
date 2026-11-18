import { useEffect, useRef, useState } from 'react'
import { markup, mountCatalog } from '../../generated/catalog'
export default function TitlesPage(){
 const host=useRef<HTMLDivElement>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{
  let cancelled=false
  let dispose:(()=>void)|undefined
  // StrictMode's discarded setup must not mark a release as already opened.
  queueMicrotask(()=>{
   if(cancelled||!host.current)return
   const root=host.current.shadowRoot??host.current.attachShadow({mode:'open'})
   try{
    root.innerHTML=markup.replaceAll('__CATALOG_BASE__',import.meta.env.BASE_URL)
    dispose=mountCatalog(root)
   }catch(error){console.error('Catalog mount failed',error);setError(true)}
  })
  return ()=>{cancelled=true;dispose?.()}
 },[])
 return <>{error&&<p role="alert">칭호 도감을 열지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>}<div ref={host} aria-label="칭호 도감" /></>
}

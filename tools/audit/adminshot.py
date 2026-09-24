import asyncio,json,sys,os,re
from playwright.async_api import async_playwright
tok=json.load(open('/home/claude/aud/admin_login.json'))['token']
pages=sys.argv[1].split(','); out=sys.argv[2]
os.makedirs('/home/claude/aud/ashots',exist_ok=True)
async def main():
  res=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':1366,'height':900},locale='ar-SA')
    await ctx.add_cookies([{'name':'admin_access','value':tok['accessToken'],'domain':'localhost','path':'/'},{'name':'admin_refresh','value':tok.get('refreshToken',''),'domain':'localhost','path':'/'},{'name':'admin_csrf','value':'auditcsrf123456','domain':'localhost','path':'/'}])
    for r in pages:
      pg=await ctx.new_page(); errs=[]; api=[]
      pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)[:150]))
      pg.on('console',lambda m: errs.append(m.text[:150]) if m.type=='error' and 'Failed to load resource' not in m.text else None)
      pg.on('response',lambda rs: api.append((rs.status,rs.request.method,rs.url.split('localhost:3001')[-1][:110])) if '/api/admin' in rs.url else None)
      try: resp=await pg.goto('http://localhost:3001'+r,timeout=180000,wait_until='networkidle'); st=resp.status if resp else 0
      except Exception as e: st=-1; errs.append('NAV '+str(e)[:90])
      await pg.wait_for_timeout(1500)
      name=r.strip('/').replace('/','_').replace('[','').replace(']','') or 'root'
      try: await pg.screenshot(path=f'/home/claude/aud/ashots/{name}.png')
      except: pass
      try: txt=await pg.inner_text('body')
      except: txt=''
      btns=await pg.evaluate("Array.from(document.querySelectorAll('button,a')).filter(b=>b.offsetParent).length") if st!=-1 else 0
      res.append(dict(page=r,status=st,final=pg.url.split('3001')[-1],api=api,errors=errs[:5],buttons=btns,text=re.sub(r'\s+',' ',txt)[:500]))
      await pg.close()
      old=json.load(open(out)) if os.path.exists(out) else []
      json.dump(old+[res[-1]],open(out,'w'),ensure_ascii=False,indent=1)
    await b.close()
asyncio.run(main())

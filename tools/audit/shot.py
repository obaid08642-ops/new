import asyncio,json,sys,os
from playwright.async_api import async_playwright
routes=sys.argv[1].split(',');out=sys.argv[2];cookie=sys.argv[3] if len(sys.argv)>3 else None
os.makedirs('/home/claude/aud/shots',exist_ok=True)
async def main():
  res=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,locale='ar-SA')
    if cookie:
        await ctx.add_cookies([{'name':k,'value':v,'domain':'localhost','path':'/'} for k,v in json.loads(cookie).items()])
    for r in routes:
      pg=await ctx.new_page(); errs=[]; bad=[]
      pg.on('console',lambda m: errs.append(m.text[:160]) if m.type=='error' else None)
      pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)[:160]))
      pg.on('response',lambda rs: bad.append(f'{rs.status} {rs.url[21:120]}') if rs.status>=400 and 'localhost:3000' in rs.url and '_next' not in rs.url else None)
      try:
        resp=await pg.goto('http://localhost:3000'+r,timeout=150000,wait_until='networkidle'); st=resp.status if resp else 0
      except Exception as e: st=-1; errs.append('NAV '+str(e)[:100])
      name=r.strip('/').replace('/','_') or 'root'
      try: await pg.screenshot(path=f'/home/claude/aud/shots/{name}.png',full_page=False)
      except: pass
      txt=(await pg.inner_text('body'))[:400] if st!=-1 else ''
      res.append(dict(route=r,status=st,final=pg.url[21:],errors=errs[:6],bad=bad[:8],text=txt.replace('\n',' | ')[:300]))
      await pg.close()
    await b.close()
  old=json.load(open(out)) if os.path.exists(out) else []
  json.dump(old+res,open(out,'w'),ensure_ascii=False,indent=1)
asyncio.run(main())

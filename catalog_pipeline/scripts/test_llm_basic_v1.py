#!/usr/bin/env python3
import json
from pathlib import Path
from openai import OpenAI
client=OpenAI()
r=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'user','content':'Return exactly this JSON object and nothing else: {"ok":true}'}],max_completion_tokens=100)
out=r.model_dump();Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/test_llm_basic_v1.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(out,ensure_ascii=False,indent=2))

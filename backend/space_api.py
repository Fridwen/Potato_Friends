import asyncio
import base64
import hashlib
import json
import math
import os
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from starlette.datastructures import UploadFile
from openai import AsyncOpenAI, APIError, APITimeoutError
from jsonschema import validate, ValidationError
from space_geometry import normalize

router=APIRouter()
ROOT=Path(__file__).parent
SCHEMA=json.loads((ROOT/'space_schema.json').read_text(encoding='utf-8'))
PROMPT=(ROOT/'space_prompt.txt').read_text(encoding='utf-8')
CACHE={}
LOCK=asyncio.Semaphore(2)
MAX_BODY=57*1024*1024


def mime(data):
    if data.startswith(b'\xff\xd8\xff'): return 'image/jpeg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'): return 'image/png'
    if data[:4]==b'RIFF' and data[8:12]==b'WEBP': return 'image/webp'
    return None


@router.post('/api/space/analyze')
async def analyze(request: Request):
    started=time.monotonic()
    # Bound actual bytes, including requests without Content-Length, before multipart parsing.
    chunks=[]; total=0
    async for chunk in request.stream():
        total+=len(chunk)
        if total>MAX_BODY: raise HTTPException(413,'전체 업로드는 57MB 이하여야 합니다.')
        chunks.append(chunk)
    async def receive():
        return {'type':'http.request','body':b''.join(chunks),'more_body':False}
    bounded=Request(request.scope,receive)
    try:
        async with bounded.form(max_files=7,max_fields=5,max_part_size=MAX_BODY) as form:
            try: area=float(form.get('area',''))
            except (ValueError,TypeError): raise HTTPException(400,'전용면적을 입력해 주세요.')
            if not math.isfinite(area) or not 8<=area<=80: raise HTTPException(400,'전용면적은 8~80㎡입니다.')
            photos=form.getlist('photos'); plans=form.getlist('floorPlan')
            if len(photos)>6 or len(plans)>1 or not photos+plans: raise HTTPException(400,'평면도 1장 또는 실내 사진 1~6장을 입력해 주세요.')
            images=[]
            for file in plans+photos:
                if not isinstance(file,UploadFile): raise HTTPException(400,'이미지 파일을 선택해 주세요.')
                data=await file.read(8*1024*1024+1)
                if not data or len(data)>8*1024*1024: raise HTTPException(413,'이미지는 장당 8MB 이하입니다.')
                kind=mime(data)
                if not kind or file.content_type!=kind: raise HTTPException(400,'JPG·PNG·WebP 이미지만 가능합니다.')
                images.append('data:'+kind+';base64,'+base64.b64encode(data).decode())
            force=form.get('force')=='true'
    except HTTPException: raise
    except Exception: raise HTTPException(400,'업로드 형식을 확인해 주세요.')
    key=os.getenv('OPENAI_API_KEY')
    if not key: raise HTTPException(503,'FastAPI 서버의 OPENAI_API_KEY 환경변수를 설정해 주세요.')
    digest=hashlib.sha256(json.dumps([PROMPT,key,area,bool(plans),images]).encode()).hexdigest()
    async with LOCK:
        now=time.monotonic()
        for k in list(CACHE):
            if CACHE[k][0]<now: del CACHE[k]
        if not force and digest in CACHE:
            return {'space':CACHE[digest][1],'cached':True,'durationMs':round((now-started)*1000)}
        text=f'전용면적: {area}㎡. '+('이미지 1은 평면도입니다. 나머지 이미지만 실내 사진이며, 평면도 단독 분석도 가능합니다.' if plans else '평면도 없이 실내 사진만 제공합니다.')+' evidence.photos는 이미지 순서대로 1부터 사용하세요.'
        try:
            async with AsyncOpenAI(api_key=key,timeout=240,max_retries=0) as client:
                result=await client.responses.create(model='gpt-6-astra',reasoning={'effort':'low'},store=False,instructions=PROMPT,input=[{'role':'user','content':[{'type':'input_text','text':text}]+[{'type':'input_image','image_url':url,'detail':'high'} for url in images]}],text={'format':{'type':'json_schema','name':'studio_space','strict':True,'schema':SCHEMA}},max_output_tokens=24000)
            if result.status!='completed' or not result.output_text: raise HTTPException(422,'공간을 분석하지 못했습니다. 선명한 평면도 또는 실내 사진으로 다시 시도해 주세요.')
            raw=json.loads(result.output_text,parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite')))
            def finite(value):
                if isinstance(value,float) and not math.isfinite(value): raise ValueError('nonfinite')
                if isinstance(value,dict):
                    for v in value.values(): finite(v)
                if isinstance(value,list):
                    for v in value: finite(v)
            finite(raw)
            validate(raw,SCHEMA)
            space=normalize(raw,area,len(images))
        except APITimeoutError: raise HTTPException(504,'분석 시간이 초과되었습니다. 다시 시도해 주세요.')
        except APIError as e:
            raise HTTPException(429 if e.status_code==429 else 502,'OpenAI 사용 한도 또는 모델·키 권한을 확인해 주세요.')
        except (ValueError,ValidationError): raise HTTPException(502,'분석 데이터가 올바르지 않습니다. 다시 시도해 주세요.')
        if len(CACHE)>=12: CACHE.pop(next(iter(CACHE)))
        CACHE[digest]=(time.monotonic()+300,space)
        return {'space':space,'cached':False,'durationMs':round((time.monotonic()-started)*1000)}

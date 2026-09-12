import copy
import math


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def positive(n, fallback):
    return n if n > 0 else fallback


def subtract(a, b):
    l, t = max(a['x'], b['x']), max(a['z'], b['z'])
    r, bottom = min(a['x']+a['width'], b['x']+b['width']), min(a['z']+a['depth'], b['z']+b['depth'])
    if l >= r or t >= bottom:
        return [a]
    return [dict(a, x=x, z=z, width=w, depth=d) for x,z,w,d in [
        (a['x'], a['z'], a['width'], t-a['z']),
        (a['x'], bottom, a['width'], a['z']+a['depth']-bottom),
        (a['x'], t, l-a['x'], bottom-t), (r,t,a['x']+a['width']-r,bottom-t)
    ] if w > 1e-6 and d > 1e-6]


def normalize(raw, area, photo_count):
    s = copy.deepcopy(raw)
    ow, od = positive(s['shell']['width'],4), positive(s['shell']['depth'],5)
    actual = clamp(ow*od, area*.8, area)
    w = math.sqrt(actual * clamp(ow/od,.35,2.85)); d = actual/w
    sx, sz = w/ow, d/od
    h = clamp(positive(s['shell']['height'],2.4),2,3.5)
    s['shell'].update(width=w,depth=d,height=h)
    def observed(item):
        e=item['evidence']; e['photos']=sorted(set(i for i in e['photos'] if 1<=i<=photo_count))
        if not e['photos']: e['source']='inferred'
        return e['source']=='observed' and bool(e['photos'])
    observed(s['shell'])
    supporting={o['wallId']:o['evidence'] for o in s['openings'] if observed(o)}
    for p in s['partitions']:
        if p['id'] in supporting and not observed(p): p['evidence']=copy.deepcopy(supporting[p['id']])
    for key in ['zones','partitions','openings','furniture','connections']:
        s[key]=[v for v in s[key] if observed(v)]
    zones=[]
    for name in ['화장실','방']:
        matches=[z for z in s['zones'] if z['name']==name]
        if not matches: continue
        z=max(matches,key=lambda a:positive(a['width'],0)*positive(a['depth'],0))
        x=clamp(z['x']*sx,0,w-.1); zz=clamp(z['z']*sz,0,d-.1)
        parts=[dict(z,x=x,z=zz,width=clamp(positive(z['width']*sx,.5),.1,w-x),depth=clamp(positive(z['depth']*sz,.5),.1,d-zz))]
        for used in zones: parts=[fragment for p in parts for fragment in subtract(p,used)]
        for i,p in enumerate(parts): p['id']=f'zone-{name}-{i}'
        zones.extend(parts)
    # Preserve connection references to first surviving fragment.
    zone_map={z['id']:next((p['id'] for p in zones if p['name']==z['name']),None) for z in s['zones']}
    s['zones']=zones
    wall_map={}; partitions=[]
    for i,p in enumerate(s['partitions']):
        old=p['id']; x=clamp(p['x']*sx,0,w); z=clamp(p['z']*sz,0,d)
        length=clamp(positive(p['length']*(sx if p['axis']=='x' else sz),1),0,w-x if p['axis']=='x' else d-z)
        if length<=.1: continue
        p.update(id=f'partition-{i}',x=x,z=z,length=length,height=clamp(positive(p['height'],h),.3,h))
        wall_map[old]=p['id']; partitions.append(p)
    s['partitions']=partitions
    walls={p['id']:(p['axis'],p['length'],p['height']) for p in partitions}
    walls.update(north=('x',w,h),south=('x',w,h),east=('z',d,h),west=('z',d,h))
    openings=[]
    for o in s['openings']:
        wid=wall_map.get(o['wallId'],o['wallId'])
        if wid not in walls: continue
        axis,length,height=walls[wid]
        width=clamp(positive(o['width'],.8),min(.2,length),length)
        offset=clamp(o['offset']*(sx if axis=='x' else sz),0,length-width)
        oh=clamp(positive(o['height'],2),.2,height)
        if any(a['wallId']==wid and a['kind']==o['kind'] and abs(a['offset']-offset)<.1 for a in openings): continue
        o.update(id=f'opening-{len(openings)}',wallId=wid,width=width,offset=offset,height=oh,sill=0 if o['kind']=='door' else clamp(o['sill'],0,height-oh))
        openings.append(o)
    s['openings']=openings
    furniture=[]; identities=set()
    for f in s['furniture']:
        identity=f['identity'].strip().lower() or f['id']
        if identity in identities: continue
        identities.add(identity)
        rotation=(math.floor(f['rotation']/90+.5)*90)%360
        fw=clamp(positive(f['width'],.6),.15,4); fd=clamp(positive(f['depth'],.6),.15,4)
        swapped=rotation in (90,270)
        scale=min(1,(w-.08)/(fd if swapped else fw),(d-.08)/(fw if swapped else fd))
        fw*=scale; fd*=scale; hx=(fd if swapped else fw)/2; hz=(fw if swapped else fd)/2
        f.update(id=f'furniture-{len(furniture)}',identity=identity,width=fw,depth=fd,rotation=rotation,x=clamp(f['x']*sx,hx+.02,w-hx-.02),z=clamp(f['z']*sz,hz+.02,d-hz-.02),height=clamp(positive(f['height'],.7),.1,h-.1))
        if any(g['kind']==f['kind'] and math.hypot(g['x']-f['x'],g['z']-f['z'])<.25 for g in furniture): continue
        furniture.append(f)
    s['furniture']=furniture
    connections=[]
    for c in s['connections']:
        a,b=zone_map.get(c['from']),zone_map.get(c['to'])
        if a and b and a!=b: connections.append(dict(c,**{'from':a,'to':b}))
    s['connections']=connections
    s['area']=area
    s['corrections']=['전체 외곽 면적은 입력 면적의 80~100% 범위로 보정했습니다. 공간 중복·벽 밖 좌표·음수 크기·중복 가구를 검증했습니다.']
    s['assumptions']=list(dict.fromkeys(s['assumptions']+['절대 치수와 높이는 추정이며 실제 공간과 다를 수 있습니다. 문은 입구와 문틀만 표시합니다.']))
    return s

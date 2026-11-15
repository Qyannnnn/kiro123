# Make siaga999_live.html: one file, works offline (Leaflet, fonts and a backup map inlined).
import re, base64, random
src=open('src/siaga999_multi.html').read()
nm='node_modules'
css=open(f'{nm}/leaflet/dist/leaflet.css').read()
js=open(f'{nm}/leaflet/dist/leaflet.js').read()
src=src.replace('<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">','<style>'+css+'</style>')
src=src.replace('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>','<script>'+js+'</script>')
faces=''
for w in (400,500,600,700,800):
    b=base64.b64encode(open(f'{nm}/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-{w}-normal.woff2','rb').read()).decode()
    faces+=f"@font-face{{font-family:'Plus Jakarta Sans';font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2')}}"
src=re.sub(r'<link href="https://fonts.googleapis.com[^>]*>','<style>'+faces+'</style>',src)
random.seed(7);W,H=1600,1000
p=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#f3f3f5"/>']
for _ in range(14): p.append(f'<ellipse cx="{random.randint(0,W)}" cy="{random.randint(0,H)}" rx="{random.randint(25,70)}" ry="{random.randint(15,40)}" fill="#e2e6e1"/>')
for _ in range(60):
    if random.random()<.5: y=random.randint(0,H);p.append(f'<path d="M0 {y} Q {W/2} {y+random.randint(-60,60)} {W} {y+random.randint(-80,80)}" stroke="#fff" stroke-width="5" fill="none"/>')
    else: x=random.randint(0,W);p.append(f'<path d="M{x} 0 Q {x+random.randint(-60,60)} {H/2} {x+random.randint(-80,80)} {H}" stroke="#fff" stroke-width="5" fill="none"/>')
for _ in range(9):
    if random.random()<.5: y=random.randint(0,H);p.append(f'<path d="M0 {y} C {W/3} {y-120} {2*W/3} {y+120} {W} {y}" stroke="#d7d8de" stroke-width="9" fill="none"/>')
    else: x=random.randint(0,W);p.append(f'<path d="M{x} 0 C {x-120} {H/3} {x+120} {2*H/3} {x} {H}" stroke="#d7d8de" stroke-width="9" fill="none"/>')
p.append('<path d="M0 620 C 300 520 500 760 800 640 S 1300 480 1600 560" stroke="#d3dbe6" stroke-width="22" fill="none"/></svg>')
uri='data:image/svg+xml;base64,'+base64.b64encode(''.join(p).encode()).decode()
src=src.replace(':root{',f':root{{--offline-map:url("{uri}");',1)
src=src.replace('<script src="triage_rules.js"></script>','<script>'+open('src/triage_rules.js').read()+'</script>')
open('index.html','w').write(src)
print(len(src)//1024,'KB')

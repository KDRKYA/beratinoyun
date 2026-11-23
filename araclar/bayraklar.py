import math
import numpy as np
from PIL import Image, ImageDraw

W, H = 600, 300

def star(d, cx, cy, r, n=5, inner=0.38, fill='white', rot=-90):
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)

def flag(name):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    if name == 'afghanistan':
        d.rectangle([0, 0, W/3, H], fill=(0, 0, 0)); d.rectangle([W/3, 0, 2*W/3, H], fill=(210, 16, 52)); d.rectangle([2*W/3, 0, W, H], fill=(0, 122, 54))
        cx, cy = W/2, H/2
        d.ellipse([cx-75, cy-75, cx+75, cy+75], outline='white', width=8)
        for k in range(14):  # wheat-like leaves around wreath
            a = math.radians(200 + k * 10.5)
            for sgn in (1, -1):
                aa = math.pi - a if sgn < 0 else a
                x, y = cx + 64*math.cos(aa), cy - 64*math.sin(aa) * -1
                d.ellipse([x-6, y-10, x+6, y+10], fill='white')
        d.rectangle([cx-32, cy-6, cx+32, cy+36], fill='white')
        d.polygon([(cx-40, cy-6), (cx, cy-34), (cx+40, cy-6)], fill='white')
        d.rectangle([cx-44, cy-30, cx-38, cy+36], fill='white'); d.rectangle([cx+38, cy-30, cx+44, cy+36], fill='white')
        d.rectangle([cx-9, cy+8, cx+9, cy+36], fill=(210, 16, 52))
    elif name == 'suriye':
        for i, c in enumerate([(0, 122, 61), (255, 255, 255), (0, 0, 0)]):
            d.rectangle([0, i*H/3, W, (i+1)*H/3], fill=c)
        for x in (W/2-110, W/2, W/2+110):
            star(d, x, H/2, 42, fill=(206, 17, 38))
    elif name == 'kurdistan':
        for i, c in enumerate([(237, 41, 57), (255, 255, 255), (39, 137, 53)]):
            d.rectangle([0, i*H/3, W, (i+1)*H/3], fill=c)
        star(d, W/2, H/2, 62, n=21, inner=0.55, fill=(254, 189, 17))
        d.ellipse([W/2-26, H/2-26, W/2+26, H/2+26], fill=(254, 189, 17))
    elif name == 'turkiye':
        red = (227, 10, 23); d.rectangle([0, 0, W, H], fill=red)
        G = H; ox = W/2 - 0.6*G  # official proportions (G = flag height)
        cx, cy, R = ox + 0.5*G, H/2, 0.25*G
        d.ellipse([cx-R, cy-R, cx+R, cy+R], fill='white')
        cx2, R2 = cx + 0.0625*G, 0.2*G
        d.ellipse([cx2-R2, cy-R2, cx2+R2, cy+R2], fill=red)
        star(d, cx2 + G/3 + 0.125*G, cy, 0.125*G, fill='white', rot=180)
    elif name == 'azerbaycan':
        for i, c in enumerate([(0, 181, 226), (239, 51, 64), (80, 158, 47)]):
            d.rectangle([0, i*H/3, W, (i+1)*H/3], fill=c)
        red = (239, 51, 64)
        d.ellipse([W/2-15-38, H/2-38, W/2-15+38, H/2+38], fill='white')
        d.ellipse([W/2-5-31, H/2-31, W/2-5+31, H/2+31], fill=red)
        star(d, W/2+32, H/2, 17, n=8, inner=0.5, fill='white')
    return np.asarray(im).astype(np.float32)

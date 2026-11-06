"""Standalone export of the launch video's end-card logo animation:
mark draws -> gold candles rise -> 'pickmyfund.com' types -> SIMPLE. CLEAR. INVESTED. -> MF disclaimer.
Usage: python3 logo_export.py <variant> > raw RGBA frames on stdout
variants: portrait | square | portrait_alpha | square_alpha | still:<variant>:<seconds>:<out.png>"""
import sys, os
os.environ.setdefault("END", "40")
from render import *
from edit import bt, BP, pop, vis
import mf
from mf import typed_logo, PLATE_CLEAN, T_END
def lerp(a, b, k): return a + (b - a) * k

DUR = 8.0                          # 6.8 s of animation + a short hold on the finished card
SLAM = [("SIMPLE.", WHITE, 5), ("CLEAR.", WHITE, 6), ("INVESTED.", GOLD, 7)]
BIG = [0.0, 5 * BP, 6 * BP, 7 * BP]      # punch-in moments (seconds from the start)

def end_card(cv, s, disclaimer_y=None):
    u = T_END + s
    typed_logo(cv, W / 2, 700, u, T_END + .25, T_END + 1.2 * BP, T_END + 2.6 * BP)
    fs = font("black", 128)
    for j, (w_, col, b) in enumerate(SLAM):
        t0 = b * BP
        if s < t0: continue
        k = prog(s, t0, t0 + .16); sc = lerp(1.7, 1.0, eo(k)); al = min(1, k * 2.5); y = 1000 + j * 158
        cv.save(); cv.translate(W / 2, y - 45); cv.scale(sc, sc); cv.translate(-W / 2, -(y - 45))
        text(cv, w_, W / 2, y, fs, col, al, align="c", shadow=8); cv.restore()
    if disclaimer_y is not None and s >= 9 * BP:
        al = vis(s, 9 * BP, .4); f = font("med", 25)
        text(cv, "Mutual fund investments are subject to market risks,", W / 2, disclaimer_y, f, "#7E8B8D", al, align="c")
        text(cv, "read all scheme related documents carefully.", W / 2, disclaimer_y + 36, f, "#7E8B8D", al, align="c")

def frame(variant, s):
    square = variant.startswith("square"); alpha = variant.endswith("alpha")
    w, h = (W, W) if square else (W, H); dy = -430 if square else 0
    surf = skia.Surface(w, h); cv = surf.getCanvas(); cv.clear(skia.ColorTRANSPARENT)
    if not alpha: cv.drawImage(PLATE_CLEAN, 0, dy)
    last = max(c for c in BIG if c <= s)
    sc = 1 + .045 * (1 - eo(prog(s, last, last + .3)))
    cv.save(); cv.translate(w / 2, h / 2); cv.scale(sc, sc); cv.translate(-w / 2, -h / 2); cv.translate(0, dy)
    end_card(cv, s, None if alpha else (1730 if not square else 985 + 430))
    cv.restore()
    fl = .16 * (1 - prog(s, last, last + .12)) if last >= 4 * BP or last == 0 else 0
    if fl > 0 and not alpha: cv.drawRect(skia.Rect(0, 0, w, h), skia.Paint(Color=C("#FFF4D6", fl)))
    return surf

if __name__ == "__main__":
    v = sys.argv[1]
    if v.startswith("still:"):
        _, var, sec, path = v.split(":"); frame(var, float(sec)).makeImageSnapshot().save(path, skia.kPNG); sys.exit()
    out = sys.stdout.buffer
    for i in range(int(DUR * FPS)):
        out.write(frame(v, i / FPS).makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType).tobytes())

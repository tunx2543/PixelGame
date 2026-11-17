#!/usr/bin/env python3
"""
Extract real transparent PNG sprites and uniform bottom-center-anchored Sprite Sheets
from public/assets/aistudio/file_000000005be88211b0406297a567b61e_c18c8d42.png.
"""
import math
import os
import subprocess
from collections import deque

SRC = "public/assets/aistudio/file_000000005be88211b0406297a567b61e_c18c8d42.png"
W, H = 1536, 1024

print("Reading source PNG via ImageMagick...")
RAW = subprocess.check_output(["convert", SRC, "rgba:-"])
assert len(RAW) == W * H * 4


def read_rgba(x0, y0, x1, y1):
    x0 = max(0, int(x0)); y0 = max(0, int(y0))
    x1 = min(W, int(x1)); y1 = min(H, int(y1))
    gw = x1 - x0; gh = y1 - y0
    buf = bytearray(gw * gh * 4)
    for dy in range(gh):
        src_off = ((y0 + dy) * W + x0) * 4
        dst_off = dy * gw * 4
        buf[dst_off:dst_off + gw * 4] = RAW[src_off:src_off + gw * 4]
    return buf, gw, gh


def save_png(buf, w, h, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    p = subprocess.Popen(
        ["convert", "-size", f"{w}x{h}", "-depth", "8", "rgba:-", f"PNG32:{path}"],
        stdin=subprocess.PIPE,
    )
    p.communicate(bytes(buf))
    if p.returncode != 0:
        raise RuntimeError(f"Failed saving {path}")


def is_cool_neutral_checker(r, g, b):
    """True for baked grey/white checkerboard pixels (very low chroma, neutral grey/white)."""
    mx = max(r, g, b)
    mn = min(r, g, b)
    return (mx - mn) <= 10 and mn >= 186


def is_outer_checker(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    return (mx - mn) <= 22 and mn >= 182


def filter_main_body_and_nearby(buf, w, h, max_dist_px=12, keep_min_area=18):
    """
    Keep the main connected sprite body plus nearby detached elements (halos, floating blades,
    arrows, magic sparks within max_dist_px of the main bounding box or >= keep_min_area),
    while discarding distant stray artifacts (e.g. neighbor corner sword tip or stray banner edge).
    """
    out = bytearray(buf)
    seen = bytearray(w * h)
    comps = []
    for idx in range(w * h):
        if out[idx*4+3] == 0 or seen[idx]:
            continue
        comp = []
        min_x = w; min_y = h; max_x = 0; max_y = 0
        q = deque([idx])
        seen[idx] = 1
        while q:
            c = q.popleft()
            comp.append(c)
            cx = c % w; cy = c // w
            if cx < min_x: min_x = cx
            if cx > max_x: max_x = cx
            if cy < min_y: min_y = cy
            if cy > max_y: max_y = cy
            for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nidx = ny * w + nx
                    if out[nidx*4+3] > 0 and not seen[nidx]:
                        seen[nidx] = 1
                        q.append(nidx)
        comps.append((len(comp), min_x, min_y, max_x, max_y, comp))
    if not comps:
        return out
    comps.sort(key=lambda t: t[0], reverse=True)
    main_area, mx0, my0, mx1, my1, _ = comps[0]
    for area, cx0, cy0, cx1, cy1, comp in comps:
        if area == main_area:
            continue
        # Discard tiny speckles
        if area < keep_min_area:
            for c in comp:
                out[c*4+3] = 0
            continue
        # Discard edge-touching artifacts far from main body (like top corner sword tips or border lines)
        touches_top_edge = (cy0 <= 3 and cy1 < my0 + 10 and area < main_area * 0.14)
        touches_border_line = ((cx1 - cx0 <= 4 or cy1 - cy0 <= 4) and (cx0 <= 1 or cy0 <= 1 or cx1 >= w - 2 or cy1 >= h - 2))
        far_from_main = (cx1 < mx0 - max_dist_px or cx0 > mx1 + max_dist_px or cy1 < my0 - max_dist_px or cy0 > my1 + max_dist_px)
        if touches_top_edge or touches_border_line or (far_from_main and area < main_area * 0.15):
            for c in comp:
                out[c*4+3] = 0
    return out


def strip_checker_bg(buf, w, h, keep_vfx_glow=False, allow_interior_checker=True):
    """
    Strip baked checkerboard via outer-edge BFS, plus STRICT cool-neutral checkerboard pocket removal
    (never touches Wizard's lavender skin, eyes, or Priest's white/warm-cream robe, or skeleton skulls).
    """
    out = bytearray(buf)
    alpha = [255] * (w * h)
    visited = bytearray(w * h)
    q = deque()

    def is_bg_outer(idx):
        o = idx * 4
        r, g, b = out[o], out[o+1], out[o+2]
        mx = max(r, g, b); mn = min(r, g, b)
        sat = mx - mn
        lum = (r + g + b) / 3.0
        if is_outer_checker(r, g, b):
            return True
        if lum >= 208 and sat <= 42:
            return True
        if keep_vfx_glow and lum >= 220 and sat <= 60:
            return True
        return False

    for x in range(w):
        for y in (0, h - 1):
            idx = y * w + x
            if not visited[idx] and is_bg_outer(idx):
                visited[idx] = 1
                q.append(idx)
    for y in range(h):
        for x in (0, w - 1):
            idx = y * w + x
            if not visited[idx] and is_bg_outer(idx):
                visited[idx] = 1
                q.append(idx)

    while q:
        idx = q.popleft()
        alpha[idx] = 0
        x = idx % w; y = idx // w
        for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not visited[nidx] and is_bg_outer(nidx):
                    visited[nidx] = 1
                    q.append(nidx)

    if allow_interior_checker:
        # Strict check: ONLY strip enclosed pockets that are strictly cool-neutral (|r-b|<=6)
        # AND clearly alternate grey (~196..218) + white (~240..255), NEVER in the upper-face zone!
        seen_int = bytearray(w * h)
        for idx in range(w * h):
            if alpha[idx] == 0 or seen_int[idx]:
                continue
            o = idx * 4
            r, g, b = out[o], out[o+1], out[o+2]
            if not is_cool_neutral_checker(r, g, b):
                continue
            comp = []
            cq = deque([idx])
            seen_int[idx] = 1
            grey_cnt = 0; white_cnt = 0; warm_cnt = 0
            min_y = h; max_y = 0
            while cq:
                c = cq.popleft()
                comp.append(c)
                co = c * 4
                cr, cg, cb = out[co], out[co+1], out[co+2]
                lum = (cr + cg + cb) / 3.0
                if cr - cb > 6 or cb - cr > 8:
                    warm_cnt += 1
                if 190 <= lum <= 220: grey_cnt += 1
                if lum >= 242: white_cnt += 1
                cy = c // w
                if cy < min_y: min_y = cy
                if cy > max_y: max_y = cy
                cx = c % w
                for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if alpha[nidx] > 0 and not seen_int[nidx]:
                            no = nidx * 4
                            if is_cool_neutral_checker(out[no], out[no+1], out[no+2]):
                                seen_int[nidx] = 1
                                cq.append(nidx)
            # Never punch face/eyes/chest white robes: require strict checkerboard grey+white mix & warm_cnt==0
            is_true_checker_hole = (warm_cnt == 0 and grey_cnt >= 10 and white_cnt >= 6)
            is_lower_leg_gap = (min_y > h * 0.70 and warm_cnt == 0 and grey_cnt >= 4 and len(comp) >= 6)
            if is_true_checker_hole or is_lower_leg_gap:
                for c in comp:
                    alpha[c] = 0

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            o = idx * 4
            if alpha[idx] == 0:
                out[o+3] = 0
                continue
            adj_bg = any(
                not (0 <= nx < w and 0 <= ny < h) or alpha[ny*w+nx] == 0
                for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1))
            )
            if adj_bg:
                r, g, b = out[o], out[o+1], out[o+2]
                mx = max(r, g, b); mn = min(r, g, b)
                lum = (r + g + b) / 3.0
                sat = mx - mn
                if sat <= 24 and lum >= 176:
                    out[o+3] = 0
                elif sat <= 42 and lum >= 196:
                    out[o+3] = int(max(0, min(255, (238 - lum) * 4.5)))
                else:
                    out[o+3] = 255
            else:
                out[o+3] = 255

    return filter_main_body_and_nearby(out, w, h, max_dist_px=14, keep_min_area=14)


def strip_card_bg(buf, w, h, strip_lower_leg_gaps=True):
    """Strip solid/pastel tinted card background cleanly without punching holes in skulls or white fur."""
    out = bytearray(buf)
    alpha = [255] * (w * h)
    visited = bytearray(w * h)

    # Sample bright interior corner pixels to learn exact card pastel color
    samples = []
    for yy in list(range(2, min(12, h))) + list(range(max(0, h-12), h-2)):
        for xx in list(range(2, min(12, w))) + list(range(max(0, w-12), w-2)):
            o = (yy * w + xx) * 4
            r, g, b = out[o], out[o+1], out[o+2]
            if (r + g + b) / 3.0 > 208:
                samples.append((r, g, b))
    if samples:
        br = sum(c[0] for c in samples) / len(samples)
        bg = sum(c[1] for c in samples) / len(samples)
        bb = sum(c[2] for c in samples) / len(samples)
    else:
        br, bg, bb = 246.0, 244.0, 242.0

    def is_bg_px(idx):
        o = idx * 4
        r, g, b = out[o], out[o+1], out[o+2]
        lum = (r + g + b) / 3.0
        mx = max(r, g, b); mn = min(r, g, b)
        sat = mx - mn
        dist = abs(r - br) + abs(g - bg) + abs(b - bb)
        if dist <= 52 and lum >= 198:
            return True
        if sat <= 22 and lum >= 196:
            return True
        return False

    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            idx = y * w + x
            if not visited[idx] and is_bg_px(idx):
                visited[idx] = 1
                q.append(idx)
    for y in range(h):
        for x in (0, w - 1):
            idx = y * w + x
            if not visited[idx] and is_bg_px(idx):
                visited[idx] = 1
                q.append(idx)

    while q:
        idx = q.popleft()
        alpha[idx] = 0
        x = idx % w; y = idx // w
        for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not visited[nidx] and is_bg_px(nidx):
                    visited[nidx] = 1
                    q.append(nidx)

    # Interior holes: ONLY strip true cool-grey/white checkerboard pockets (in Boss cards)
    # OR clear lower-half background gaps between spider/wolf legs (when not skull/fur!)
    seen_int = bytearray(w * h)
    for idx in range(w * h):
        if alpha[idx] == 0 or seen_int[idx]:
            continue
        o = idx * 4
        r, g, b = out[o], out[o+1], out[o+2]
        lum = (r + g + b) / 3.0
        dist = abs(r - br) + abs(g - bg) + abs(b - bb)
        if not ((is_cool_neutral_checker(r, g, b) and lum >= 195) or (strip_lower_leg_gaps and dist <= 28 and lum >= 220)):
            continue
        comp = []
        cq = deque([idx])
        seen_int[idx] = 1
        grey_cnt = 0; white_cnt = 0; sum_dist = 0.0
        min_y = h; max_y = 0
        while cq:
            c = cq.popleft()
            comp.append(c)
            co = c * 4
            cr, cg, cb = out[co], out[co+1], out[co+2]
            clum = (cr + cg + cb) / 3.0
            sum_dist += abs(cr - br) + abs(cg - bg) + abs(cb - bb)
            if 194 <= clum <= 220 and abs(cr - cb) <= 6: grey_cnt += 1
            if clum >= 242: white_cnt += 1
            cy = c // w
            if cy < min_y: min_y = cy
            if cy > max_y: max_y = cy
            cx = c % w
            for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nidx = ny * w + nx
                    if alpha[nidx] > 0 and not seen_int[nidx]:
                        no = nidx * 4
                        nr, ng, nb = out[no], out[no+1], out[no+2]
                        nlum = (nr + ng + nb) / 3.0
                        ndist = abs(nr - br) + abs(ng - bg) + abs(nb - bb)
                        if (is_cool_neutral_checker(nr, ng, nb) and nlum >= 195) or (strip_lower_leg_gaps and ndist <= 28 and nlum >= 220):
                            seen_int[nidx] = 1
                            cq.append(nidx)
        avg_dist = sum_dist / max(1, len(comp))
        is_checker_pocket = (grey_cnt >= 10 and white_cnt >= 6)
        is_lower_gap = (strip_lower_leg_gaps and min_y > h * 0.62 and avg_dist <= 24 and len(comp) >= 12)
        if is_checker_pocket or is_lower_gap:
            for c in comp:
                alpha[c] = 0

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            o = idx * 4
            if alpha[idx] == 0:
                out[o+3] = 0
                continue
            adj_bg = any(
                not (0 <= nx < w and 0 <= ny < h) or alpha[ny*w+nx] == 0
                for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1))
            )
            if adj_bg:
                r, g, b = out[o], out[o+1], out[o+2]
                lum = (r + g + b) / 3.0
                dist = abs(r - br) + abs(g - bg) + abs(b - bb)
                if dist <= 60 and lum >= 188:
                    out[o+3] = 0
                elif (max(r,g,b)-min(r,g,b)) <= 24 and lum >= 192:
                    out[o+3] = 0
                else:
                    out[o+3] = 255
            else:
                out[o+3] = 255

    return filter_main_body_and_nearby(out, w, h, max_dist_px=12, keep_min_area=16)


def alpha_bbox(buf, w, h, thresh=24):
    min_x, min_y = w, h
    max_x, max_y = -1, -1
    for y in range(h):
        for x in range(w):
            if buf[(y*w+x)*4+3] >= thresh:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    if max_x < min_x:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def trim_rgba(buf, w, h, pad=0):
    bb = alpha_bbox(buf, w, h)
    if not bb:
        return buf, w, h
    x0 = max(0, bb[0] - pad)
    y0 = max(0, bb[1] - pad)
    x1 = min(w, bb[2] + pad)
    y1 = min(h, bb[3] + pad)
    nw = x1 - x0; nh = y1 - y0
    nbuf = bytearray(nw * nh * 4)
    for dy in range(nh):
        so = ((y0 + dy) * w + x0) * 4
        do = dy * nw * 4
        nbuf[do:do + nw * 4] = buf[so:so + nw * 4]
    return nbuf, nw, nh


def flip_x(buf, w, h):
    nbuf = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            so = (y * w + (w - 1 - x)) * 4
            do = (y * w + x) * 4
            nbuf[do:do+4] = buf[so:so+4]
    return nbuf


def shift_rgba(buf, w, h, dx=0, dy=0):
    nbuf = bytearray(w * h * 4)
    for y in range(h):
        sy = y - dy
        if not (0 <= sy < h):
            continue
        for x in range(w):
            sx = x - dx
            if not (0 <= sx < w):
                continue
            so = (sy * w + sx) * 4
            do = (y * w + x) * 4
            nbuf[do:do+4] = buf[so:so+4]
    return nbuf


def resize_rgba_bicubic(buf, w, h, tw, th):
    p = subprocess.Popen(
        [
            "convert",
            "-size", f"{w}x{h}", "-depth", "8", "rgba:-",
            "-filter", "Lanczos", "-resize", f"{tw}x{th}!",
            "-depth", "8", "rgba:-",
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
    )
    out, _ = p.communicate(bytes(buf))
    return bytearray(out)


def place_in_frame(buf, w, h, fw, fh, target_h, anchor_y_px, offset_x=0, offset_y=0):
    if w == 0 or h == 0:
        return bytearray(fw * fh * 4)
    scale = min(target_h / h, (fw - 8) / w)
    sw = max(1, int(round(w * scale)))
    sh = max(1, int(round(h * scale)))
    scaled = resize_rgba_bicubic(buf, w, h, sw, sh)
    frame = bytearray(fw * fh * 4)
    px0 = (fw - sw) // 2 + offset_x
    py0 = anchor_y_px - sh + offset_y
    for y in range(sh):
        dy = py0 + y
        if not (0 <= dy < fh):
            continue
        for x in range(sw):
            dx = px0 + x
            if not (0 <= dx < fw):
                continue
            so = (y * sw + x) * 4
            sa = scaled[so + 3]
            if sa == 0:
                continue
            do = (dy * fw + dx) * 4
            frame[do:do+4] = scaled[so:so+4]
    return frame


def blend_over(dst, dw, dh, src, sw, sh, px0, py0, alpha_mul=1.0):
    for y in range(sh):
        dy = py0 + y
        if not (0 <= dy < dh):
            continue
        for x in range(sw):
            dx = px0 + x
            if not (0 <= dx < dw):
                continue
            so = (y * sw + x) * 4
            sa = (src[so + 3] / 255.0) * alpha_mul
            if sa <= 0.01:
                continue
            do = (dy * dw + dx) * 4
            da = dst[do + 3] / 255.0
            oa = sa + da * (1.0 - sa)
            if oa <= 0.001:
                continue
            for c in range(3):
                dst[do + c] = int(round((src[so + c] * sa + dst[do + c] * da * (1.0 - sa)) / oa))
            dst[do + 3] = int(round(oa * 255))


# ---------------------------------------------------------------------------
# HERO BACK-VIEW ("walk_up") GENERATOR — cleanly covers eyes/face with rear hair/hood/cloak
# ---------------------------------------------------------------------------
HERO_BACK_STYLES = {
    "warrior": {
        "hair": (146, 74, 48), "hair_dark": (102, 44, 26), "hair_hi": (188, 108, 66),
        "cloak": (196, 36, 50), "cloak_dark": (132, 20, 34), "trim": (224, 178, 62),
        "head_cover": "hair_cape",
    },
    "archer": {
        "hair": (232, 204, 128), "hair_dark": (186, 148, 68), "hair_hi": (250, 232, 168),
        "cloak": (48, 134, 68), "cloak_dark": (28, 86, 42), "trim": (194, 138, 64),
        "head_cover": "hood_quiver",
    },
    "wizard": {
        "hair": (196, 184, 232), "hair_dark": (146, 132, 192), "hair_hi": (232, 224, 252),
        "cloak": (92, 52, 176), "cloak_dark": (54, 28, 118), "trim": (232, 192, 68),
        "head_cover": "wizard_hat",
    },
    "priest": {
        "hair": (152, 86, 48), "hair_dark": (110, 54, 28), "hair_hi": (198, 126, 74),
        "cloak": (244, 240, 248), "cloak_dark": (200, 188, 218), "trim": (236, 188, 56),
        "head_cover": "long_hair",
    },
    "rogue": {
        "hair": (62, 44, 48), "hair_dark": (38, 26, 30), "hair_hi": (102, 74, 78),
        "cloak": (42, 40, 56), "cloak_dark": (26, 24, 34), "trim": (212, 38, 56),
        "head_cover": "scarf_hair",
    },
}


def synthesize_hero_up_frame(down_buf, w, h, hero_id, stride_idx):
    st = HERO_BACK_STYLES[hero_id]
    out = bytearray(down_buf)
    bb = alpha_bbox(out, w, h)
    if not bb:
        return out
    x0, y0, x1, y1 = bb
    bw = x1 - x0; bh = y1 - y0
    cx = (x0 + x1) // 2

    # Organic elliptical head/face center & radii so back hair blends seamlessly into existing hair silhouette
    head_cy = y0 + bh * 0.36
    head_rx = bw * 0.24
    head_ry = bh * 0.17

    for y in range(y0 + 1, y1 - 1):
        rel_y = (y - y0) / max(1.0, bh)
        if not (0.20 <= rel_y <= 0.77):
            continue
        xs = [x for x in range(x0, x1) if out[(y * w + x) * 4 + 3] >= 128]
        if len(xs) < 6:
            continue
        lx = xs[0]; rx = xs[-1]
        for x in range(lx + 4, rx - 3):
            o = (y * w + x) * 4
            if out[o + 3] < 128:
                continue
            r, g, b = out[o], out[o+1], out[o+2]
            lum = (r + g + b) / 3.0

            # Elliptical head mask (0..1+)
            ex = (x - cx) / max(1.0, head_rx)
            ey = (y - head_cy) / max(1.0, head_ry)
            e_dist = ex * ex + ey * ey

            # Back-of-head hair / hood / hat region (organic ellipse, covers skin & eyes cleanly!)
            if rel_y < 0.52 and e_dist <= 1.05:
                is_hair_edge = e_dist > 0.88
                if st["head_cover"] == "wizard_hat":
                    if rel_y < 0.36:
                        col = st["cloak_dark"] if abs(ex) > 0.55 else st["cloak"]
                    elif is_hair_edge:
                        col = st["hair_dark"]
                    else:
                        col = st["hair_dark"] if abs(ex) > 0.6 else st["hair"]
                elif st["head_cover"] == "hood_quiver":
                    if is_hair_edge or abs(ey - 0.5) < 0.12:
                        col = st["cloak_dark"]
                    else:
                        col = st["cloak_dark"] if ex > 0.45 else st["cloak"]
                else:
                    # Only paint over non-matching face/skin/eye pixels OR blend hair crown smoothly
                    strand = math.sin(ex * 5.2 + ey * 1.1)
                    if is_hair_edge and ey > 0.45:
                        # Crisp nape-of-neck hair tips dark line
                        col = (38, 22, 20)
                    elif abs(ey + 0.25) < 0.22 and abs(ex) < 0.72:
                        col = st["hair_hi"]
                    elif strand < -0.55 or ey > 0.52 or abs(ex) > 0.72:
                        col = st["hair_dark"]
                    else:
                        col = st["hair"]
                out[o], out[o+1], out[o+2] = col
                continue

            # Back torso / cape / quiver / long hair region (tapered rounded cape shape)
            if 0.48 <= rel_y <= 0.76:
                torso_t = (rel_y - 0.48) / 0.28
                torso_half = bw * (0.17 + 0.05 * math.sin(torso_t * math.pi))
                tx = (x - cx) / max(1.0, torso_half)
                if abs(tx) > 1.0:
                    continue
                if lum < 36:
                    continue
                if abs(tx) > 0.88:
                    # Subtle inner cape edge contour
                    out[o], out[o+1], out[o+2] = (38, 24, 24)
                    continue
                if st["head_cover"] == "long_hair" and rel_y < 0.67:
                    strand = math.sin(tx * 5.5)
                    col = st["hair_dark"] if (abs(tx) > 0.62 or strand < -0.5) else st["hair"]
                elif st["head_cover"] == "scarf_hair" and rel_y < 0.58:
                    col = st["trim"] if abs(tx) < 0.8 else (142, 22, 34)
                elif st["head_cover"] == "hood_quiver" and 0.49 <= rel_y <= 0.67 and abs(tx - 0.12) < 0.35:
                    col = st["trim"] if rel_y > 0.54 else (240, 234, 210)
                else:
                    fold = math.sin(tx * 4.0 + stride_idx * 0.7)
                    if rel_y < 0.53 and abs(tx) < 0.65:
                        col = st["trim"]
                    elif fold < -0.35 or abs(tx) > 0.72:
                        col = st["cloak_dark"]
                    else:
                        col = st["cloak"]
                out[o], out[o+1], out[o+2] = col

    bob = -2 if stride_idx in (1, 3) else 0
    if bob != 0:
        out = shift_rgba(out, w, h, 0, bob)
    return out


# ---------------------------------------------------------------------------
# 1. EXTRACT ALL 5 HERO CLASSES
# ---------------------------------------------------------------------------
HERO_DEFS = [
    {
        "id": "warrior",
        "showcase": (34, 62, 272, 262),
        "row1": [(38, 268, 112, 350), (114, 268, 176, 350), (178, 272, 245, 350), (246, 268, 308, 350)],
        "row2": [(38, 353, 114, 434), (115, 353, 180, 434), (182, 353, 246, 434), (247, 353, 318, 434)],
        "r1_faces_right": False,
        "r2_faces_right": False,
    },
    {
        "id": "archer",
        "showcase": (348, 62, 535, 261),
        "row1": [(340, 266, 410, 350), (412, 266, 476, 350), (478, 266, 540, 350), (542, 266, 610, 350)],
        "row2": [(338, 353, 412, 434), (413, 353, 478, 434), (480, 353, 545, 434), (543, 353, 616, 434)],
        "r1_faces_right": True,
        "r2_faces_right": True,
    },
    {
        "id": "wizard",
        "showcase": (618, 62, 882, 262),
        "row1": [(636, 265, 699, 353), (700, 265, 767, 353), (768, 265, 830, 353), (831, 265, 898, 353)],
        "row2": [(636, 354, 699, 434), (700, 354, 767, 434), (768, 354, 830, 434), (831, 354, 898, 434)],
        "r1_faces_right": False,
        "r2_faces_right": False,
    },
    {
        "id": "priest",
        "showcase": (918, 62, 1172, 261),
        "row1": [(925, 266, 995, 351), (997, 266, 1058, 351), (1060, 266, 1124, 351), (1126, 266, 1192, 351)],
        "row2": [(925, 353, 992, 434), (993, 353, 1058, 434), (1060, 353, 1123, 434), (1125, 353, 1198, 434)],
        "r1_faces_right": True,
        "r2_faces_right": True,
    },
    {
        "id": "rogue",
        "showcase": (1226, 62, 1468, 259),
        "row1": [(1226, 264, 1308, 350), (1309, 264, 1382, 350), (1383, 264, 1453, 350), (1454, 264, 1520, 350)],
        "row2": [(1225, 352, 1302, 434), (1301, 352, 1378, 434), (1378, 352, 1450, 434), (1450, 352, 1526, 434)],
        "r1_faces_right": True,
        "r2_faces_right": True,
    },
]

HERO_FW, HERO_FH = 168, 192
HERO_ANCHOR_Y = 178

for hdef in HERO_DEFS:
    hid = hdef["id"]
    out_dir = f"public/assets/hd/characters/{hid}"
    os.makedirs(out_dir, exist_ok=True)

    # Portrait
    p_buf, pw, ph = read_rgba(*hdef["showcase"])
    p_clean = strip_checker_bg(p_buf, pw, ph, keep_vfx_glow=False, allow_interior_checker=(hid != "wizard" and hid != "priest"))
    p_trim, pw, ph = trim_rgba(p_clean, pw, ph, pad=2)
    save_png(p_trim, pw, ph, f"{out_dir}/portrait.png")

    # Row 1 & Row 2
    allow_int = (hid != "wizard" and hid != "priest")
    r1_frames = []
    for box in hdef["row1"]:
        b, cw, ch = read_rgba(*box)
        clean = strip_checker_bg(b, cw, ch, keep_vfx_glow=False, allow_interior_checker=allow_int)
        tb, tw, th = trim_rgba(clean, cw, ch, pad=1)
        r1_frames.append((tb, tw, th))

    r2_frames = []
    for box in hdef["row2"]:
        b, cw, ch = read_rgba(*box)
        clean = strip_checker_bg(b, cw, ch, keep_vfx_glow=True, allow_interior_checker=allow_int)
        tb, tw, th = trim_rgba(clean, cw, ch, pad=1)
        r2_frames.append((tb, tw, th))

    if hid == "wizard":
        wiz_cast, wcw, wch = r2_frames[2]
        flame_orb, fow, foh = r2_frames[3]
        comp_w = max(wcw, fow) + 12
        comp_h = max(wch, foh) + 8
        comp_buf = bytearray(comp_w * comp_h * 4)
        blend_over(comp_buf, comp_w, comp_h, wiz_cast, wcw, wch, (comp_w - wcw) // 2, comp_h - wch)
        blend_over(comp_buf, comp_w, comp_h, flame_orb, fow, foh, (comp_w - fow) // 2 + 4, comp_h - foh, alpha_mul=0.88)
        r2_frames[3] = trim_rgba(comp_buf, comp_w, comp_h, pad=1)

    TARGET_H = 148
    walk_down_frames, walk_left_frames, walk_right_frames, walk_up_frames = [], [], [], []
    attack_frames, skill_frames = [], []

    for i in range(4):
        if hid == "archer":
            wd_src, wdw, wdh = r1_frames[i % 2]
            wd_bob = -3 if i in (1, 3) else 0
            wd_dx = -2 if i == 1 else (2 if i == 3 else 0)
        else:
            wd_src, wdw, wdh = r1_frames[i]
            wd_bob = 0; wd_dx = 0
        wd_cell = place_in_frame(wd_src, wdw, wdh, HERO_FW, HERO_FH, TARGET_H, HERO_ANCHOR_Y, wd_dx, wd_bob)
        walk_down_frames.append(wd_cell)
        save_png(wd_cell, HERO_FW, HERO_FH, f"{out_dir}/walk_down_{i}.png")

        wr_src, wrw, wrh = r1_frames[i]
        if not hdef["r1_faces_right"]:
            wr_src = flip_x(wr_src, wrw, wrh)
        wr_cell = place_in_frame(wr_src, wrw, wrh, HERO_FW, HERO_FH, TARGET_H, HERO_ANCHOR_Y)
        walk_right_frames.append(wr_cell)
        save_png(wr_cell, HERO_FW, HERO_FH, f"{out_dir}/walk_right_{i}.png")

        wl_cell = flip_x(wr_cell, HERO_FW, HERO_FH)
        walk_left_frames.append(wl_cell)
        save_png(wl_cell, HERO_FW, HERO_FH, f"{out_dir}/walk_left_{i}.png")

        wu_cell = synthesize_hero_up_frame(wd_cell, HERO_FW, HERO_FH, hid, i)
        walk_up_frames.append(wu_cell)
        save_png(wu_cell, HERO_FW, HERO_FH, f"{out_dir}/walk_up_{i}.png")

        atk_raw, akw, akh = r2_frames[min(i, 1)] if i < 2 else r2_frames[i]
        if not hdef["r2_faces_right"]:
            atk_raw = flip_x(atk_raw, akw, akh)
        lunge = 5 if i in (1, 2) else (2 if i == 3 else -2)
        atk_cell = place_in_frame(atk_raw, akw, akh, HERO_FW, HERO_FH, TARGET_H, HERO_ANCHOR_Y, offset_x=lunge)
        attack_frames.append(atk_cell)
        save_png(atk_cell, HERO_FW, HERO_FH, f"{out_dir}/attack_{i}.png")

        sk_raw, skw, skh = r2_frames[i]
        if not hdef["r2_faces_right"]:
            sk_raw = flip_x(sk_raw, skw, skh)
        sk_cell = place_in_frame(sk_raw, skw, skh, HERO_FW, HERO_FH, TARGET_H + 6, HERO_ANCHOR_Y + 2)
        skill_frames.append(sk_cell)
        save_png(sk_cell, HERO_FW, HERO_FH, f"{out_dir}/skill_{i}.png")

    rows = [walk_down_frames, walk_left_frames, walk_right_frames, walk_up_frames, attack_frames, skill_frames]
    sheet_w = HERO_FW * 4; sheet_h = HERO_FH * len(rows)
    sheet_buf = bytearray(sheet_w * sheet_h * 4)
    for ry, rframes in enumerate(rows):
        for cx, cbuf in enumerate(rframes):
            blend_over(sheet_buf, sheet_w, sheet_h, cbuf, HERO_FW, HERO_FH, cx * HERO_FW, ry * HERO_FH)
    save_png(sheet_buf, sheet_w, sheet_h, f"{out_dir}/sheet.png")
    print(f"Built hero sheet: {hid} -> {sheet_w}x{sheet_h}")


# ---------------------------------------------------------------------------
# 2. EXTRACT ALL MONSTERS & BOSSES (stop cleanly at y=647 above card bottom stroke!)
# ---------------------------------------------------------------------------
def build_monster_sheet(mid, raw_poses_boxes, fw, fh, target_h, anchor_y, faces_right_default=False, split_attack_from_end=True, portrait_box=None, strip_leg_gaps=True):
    out_dir = f"public/assets/hd/monsters/{mid}"
    os.makedirs(out_dir, exist_ok=True)

    extracted = []
    for idx, box in enumerate(raw_poses_boxes):
        b, cw, ch = read_rgba(*box)
        clean = strip_card_bg(b, cw, ch, strip_lower_leg_gaps=strip_leg_gaps)
        tb, tw, th = trim_rgba(clean, cw, ch, pad=1)
        extracted.append((tb, tw, th))
        save_png(tb, tw, th, f"{out_dir}/pose_{idx}.png")

    if portrait_box:
        pb, pw, ph = read_rgba(*portrait_box)
        pclean = strip_card_bg(pb, pw, ph, strip_lower_leg_gaps=strip_leg_gaps)
        ptrim, pw, ph = trim_rgba(pclean, pw, ph, pad=2)
        save_png(ptrim, pw, ph, f"{out_dir}/portrait.png")
    else:
        p0, pw, ph = extracted[0]
        save_png(p0, pw, ph, f"{out_dir}/portrait.png")

    n = len(extracted)
    if split_attack_from_end and n >= 2:
        walk_pool = extracted[: max(1, n - 1)] if n >= 3 else [extracted[0]]
        atk_pool = extracted[max(1, n - 2) :]
    else:
        walk_pool = extracted
        atk_pool = extracted

    walk_left_frames, walk_right_frames, attack_frames = [], [], []

    for i in range(4):
        wb, ww, wh = walk_pool[i % len(walk_pool)]
        if faces_right_default:
            wb = flip_x(wb, ww, wh)
        dy = -3 if (len(walk_pool) <= 2 and i in (1, 3)) else (-2 if i == 2 else 0)
        wl_cell = place_in_frame(wb, ww, wh, fw, fh, target_h, anchor_y, offset_y=dy)
        walk_left_frames.append(wl_cell)
        wr_cell = flip_x(wl_cell, fw, fh)
        walk_right_frames.append(wr_cell)

        ab, aw, ah = atk_pool[i % len(atk_pool)]
        if faces_right_default:
            ab = flip_x(ab, aw, ah)
        lunge_x = -6 if i in (1, 2) else (3 if i == 0 else 0)
        lunge_y = -4 if i == 1 else 0
        atk_cell = place_in_frame(ab, aw, ah, fw, fh, target_h + (4 if i in (1, 2) else 0), anchor_y, offset_x=lunge_x, offset_y=lunge_y)
        attack_frames.append(atk_cell)

    sheet_w = fw * 4; sheet_h = fh * 3
    sheet_buf = bytearray(sheet_w * sheet_h * 4)
    for ry, rframes in enumerate([walk_left_frames, walk_right_frames, attack_frames]):
        for cx, cbuf in enumerate(rframes):
            blend_over(sheet_buf, sheet_w, sheet_h, cbuf, fw, fh, cx * fw, ry * fh)
    save_png(sheet_buf, sheet_w, sheet_h, f"{out_dir}/sheet.png")
    print(f"Built monster sheet: {mid} ({n} poses) -> {sheet_w}x{sheet_h}")


MONSTER_DEFS = [
    ("slime_blue",  [(24, 491, 95, 565), (21, 570, 96, 646)], 112, 104, 78, 94, False, False),
    ("slime_green", [(97, 490, 176, 565), (97, 570, 173, 646)], 112, 104, 78, 94, False, False),
    ("slime_pink",  [(177, 490, 252, 566), (174, 570, 252, 646)], 112, 104, 78, 94, False, False),
    ("goblin", [
        (271, 490, 344, 567), (345, 490, 431, 567), (433, 490, 499, 567),
        (270, 569, 354, 647), (355, 569, 429, 647), (430, 569, 499, 647),
    ], 112, 104, 88, 96, False, True),
    ("wolf", [
        (520, 495, 650, 571), (651, 495, 759, 571),
        (517, 573, 651, 647), (652, 573, 763, 647),
    ], 120, 96, 78, 88, False, True),
    ("skeleton", [
        (786, 491, 861, 567), (862, 491, 933, 567), (935, 491, 1012, 567),
        (780, 569, 867, 647), (868, 569, 939, 647), (940, 569, 1012, 647),
    ], 112, 104, 88, 96, False, False),
    ("bat", [(1029, 490, 1116, 567), (1116, 490, 1258, 567)], 120, 104, 82, 90, False, True),
    ("spider", [(1029, 569, 1116, 646), (1117, 569, 1192, 646), (1193, 569, 1266, 646)], 112, 104, 82, 94, False, True),
    ("orc", [(1283, 490, 1393, 571), (1283, 573, 1397, 647)], 128, 120, 102, 110, False, True),
    ("golem", [(1395, 490, 1515, 571), (1398, 573, 1515, 647)], 128, 120, 102, 110, False, True),
]

for mid, boxes, fw, fh, th, ay, fr, leg_gaps in MONSTER_DEFS:
    build_monster_sheet(mid, boxes, fw, fh, th, ay, faces_right_default=fr, strip_leg_gaps=leg_gaps)

BOSS_DEFS = [
    ("boss_wolf", (19, 706, 293, 899), [(19, 903, 96, 1007), (96, 900, 206, 1007), (206, 900, 293, 1007)], 136, 128, 112, 118, False),
    ("boss_spider_queen", (319, 706, 603, 908), [(319, 910, 420, 1007), (420, 910, 517, 1007), (517, 910, 603, 1007)], 136, 128, 112, 118, True),
    ("boss_lich", (623, 706, 884, 903), [(623, 905, 724, 1007), (724, 905, 804, 1007), (804, 905, 884, 1007)], 136, 128, 112, 118, False),
    ("boss_fire_dragon", (914, 706, 1228, 905), [(914, 907, 1066, 1007), (1066, 907, 1228, 1007)], 168, 136, 120, 126, True),
    ("boss_demon_king", (1250, 706, 1516, 907), [(1250, 909, 1390, 1007), (1390, 909, 1516, 1007)], 144, 132, 116, 122, False),
]

for bid, pbox, sboxes, fw, fh, th, ay, leg_gaps in BOSS_DEFS:
    build_monster_sheet(bid, sboxes + [pbox], fw, fh, th, ay, faces_right_default=False, split_attack_from_end=True, portrait_box=pbox, strip_leg_gaps=leg_gaps)

os.makedirs(".tmp_diag", exist_ok=True)
subprocess.check_call([
    "convert",
    "public/assets/hd/characters/warrior/sheet.png",
    "public/assets/hd/characters/archer/sheet.png",
    "public/assets/hd/characters/wizard/sheet.png",
    "public/assets/hd/characters/priest/sheet.png",
    "public/assets/hd/characters/rogue/sheet.png",
    "+append", "-background", "#1e293b", "-alpha", "remove", "-alpha", "off",
    "-resize", "50%", ".tmp_diag/preview_hero_sheets.png",
])
subprocess.check_call([
    "convert",
    "public/assets/hd/monsters/slime_green/sheet.png",
    "public/assets/hd/monsters/goblin/sheet.png",
    "public/assets/hd/monsters/wolf/sheet.png",
    "public/assets/hd/monsters/skeleton/sheet.png",
    "public/assets/hd/monsters/bat/sheet.png",
    "public/assets/hd/monsters/spider/sheet.png",
    "public/assets/hd/monsters/orc/sheet.png",
    "public/assets/hd/monsters/golem/sheet.png",
    "+append", "-background", "#1e293b", "-alpha", "remove", "-alpha", "off",
    "-resize", "60%", ".tmp_diag/preview_monster_sheets.png",
])
subprocess.check_call([
    "convert",
    "public/assets/hd/monsters/boss_wolf/sheet.png",
    "public/assets/hd/monsters/boss_spider_queen/sheet.png",
    "public/assets/hd/monsters/boss_lich/sheet.png",
    "public/assets/hd/monsters/boss_fire_dragon/sheet.png",
    "public/assets/hd/monsters/boss_demon_king/sheet.png",
    "+append", "-background", "#1e293b", "-alpha", "remove", "-alpha", "off",
    "-resize", "55%", ".tmp_diag/preview_boss_sheets.png",
])
subprocess.check_call([
    "convert",
    "public/assets/hd/characters/warrior/portrait.png",
    "public/assets/hd/characters/archer/portrait.png",
    "public/assets/hd/characters/wizard/portrait.png",
    "public/assets/hd/characters/priest/portrait.png",
    "public/assets/hd/characters/rogue/portrait.png",
    "public/assets/hd/monsters/boss_wolf/portrait.png",
    "public/assets/hd/monsters/boss_lich/portrait.png",
    "public/assets/hd/monsters/boss_fire_dragon/portrait.png",
    "public/assets/hd/monsters/boss_demon_king/portrait.png",
    "+append", "-background", "#1e293b", "-alpha", "remove", "-alpha", "off",
    "-resize", "65%", ".tmp_diag/preview_portraits.png",
])
print("All regenerated cleanly!")

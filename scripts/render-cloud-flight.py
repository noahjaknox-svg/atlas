#!/usr/bin/env python3
"""Render the seamless "flying through clouds" loop used as the portal backdrop.

Procedural: tileable spectral-noise cloud layers, zooming toward a vanishing point
with phase-offset fade windows, so frame N wraps exactly to frame 0.

  python3 -m venv .venv && .venv/bin/pip install numpy opencv-python-headless imageio-ffmpeg
  .venv/bin/python scripts/render-cloud-flight.py                 # 4K + 1080p into public/videos
  .venv/bin/python scripts/render-cloud-flight.py --still 40 --width 1920 --out /tmp/still.png
"""
import argparse
import math
import multiprocessing as mp
import subprocess

import cv2
import imageio_ffmpeg
import numpy as np

LAYERS = 12
ZOOM = 4.0            # each layer grows 1x -> ZOOM x over one loop
TEX_BASE = 0.8      # fraction of the texture visible at scale 1 (smaller = bigger clouds)
SKY_TOP = np.array([4, 8, 20], np.float32)
SKY_HORIZON = np.array([36, 58, 92], np.float32)
SUN_GLOW = np.array([255, 190, 130], np.float32)
CLOUD_LIT = np.array([232, 238, 248], np.float32)
CLOUD_SHADOW = np.array([14, 22, 40], np.float32)
LIGHT = np.array([-0.55, -0.83], np.float32)   # toward the sun (x, y), screen space

args = None
textures = []   # premultiplied RGBA uint8, one per layer
background = None
vignette = None


def spectral_noise(n, rng, beta):
    """Tileable noise with a 1/f^beta amplitude spectrum, normalised to ~[0, 1]."""
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = (rng.standard_normal((n, n)) + 1j * rng.standard_normal((n, n))).astype(np.complex64)
    spec *= (f ** -beta).astype(np.float32)
    spec[0, 0] = 0
    out = np.fft.ifft2(spec).real.astype(np.float32)
    out = (out - out.mean()) / (out.std() + 1e-6)
    return out


def smoothstep(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def build_texture(n, seed):
    rng = np.random.default_rng(seed)
    base = spectral_noise(n, rng, 1.45)
    detail = spectral_noise(n, rng, 1.0)
    d = smoothstep(0.2, 1.2, base + 0.3 * detail)           # dense deck with gaps, ~55% coverage
    d = cv2.GaussianBlur(d, (0, 0), n / 700)                   # soften edges
    small = cv2.GaussianBlur(d, (0, 0), n / 160)
    large = cv2.GaussianBlur(d, (0, 0), n / 22)
    step = int(n / 70)
    lx, ly = int(LIGHT[0] * step), int(LIGHT[1] * step)
    toward_sun = np.roll(small, (-ly, -lx), axis=(0, 1))
    lit = np.clip(0.55 + 2.6 * (small - toward_sun), 0, 1)
    lit *= 1.0 - 0.55 * np.clip(large * 1.4, 0, 1)             # thick cores sit in shade
    lit = 0.12 + 0.88 * lit
    color = CLOUD_SHADOW + (CLOUD_LIT - CLOUD_SHADOW) * lit[..., None]
    alpha = np.clip(d, 0, 1) ** 1.2
    rgba = np.empty((n, n, 4), np.float32)
    rgba[..., :3] = color * alpha[..., None]
    rgba[..., 3] = alpha * 255
    return np.clip(rgba, 0, 255).astype(np.uint8)


def build_background(w, h):
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    sky = SKY_TOP + (SKY_HORIZON - SKY_TOP) * (ys ** 0.8)
    sky = np.broadcast_to(sky, (h, w, 3)).copy()
    xs = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    yv = (np.linspace(0, 1, h, dtype=np.float32)[:, None] - 0.5) * 2 * (h / w)
    r2 = (xs * 0.7) ** 2 + (yv * 1.4) ** 2
    glow = np.exp(-r2 * 3.2)[..., None] * 0.55
    return sky + SUN_GLOW * glow * 0.22


def build_vignette(w, h):
    xs = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    ys = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    return (1.0 - 0.38 * np.clip((xs ** 2 + ys ** 2) / 2, 0, 1) ** 1.2)[..., None]


def vp0(w, h, t):
    return (w * 0.5 + w * 0.02 * math.sin(2 * math.pi * t), h * 0.46 + h * 0.015 * math.sin(4 * math.pi * t + 1.0))


def radius_map(w, h, vp):
    ys = (np.arange(h, dtype=np.float32) - vp[1])[:, None]
    xs = (np.arange(w, dtype=np.float32) - vp[0])[None, :]
    return np.sqrt(xs * xs + ys * ys) / (0.5 * math.hypot(w, h))


def render_frame(f):
    w, h, frames = args.width, args.height, args.frames
    t = f / frames
    out = background.copy()
    rr = radius_map(w, h, vp0(w, h, t))
    n = textures[0].shape[0]
    vp = np.array([w * 0.5 + w * 0.02 * math.sin(2 * math.pi * t),
                   h * 0.46 + h * 0.015 * math.sin(4 * math.pi * t + 1.0)], np.float32)
    roll = math.radians(1.1) * math.sin(2 * math.pi * t + 0.6)

    phases = sorted(((t + k / LAYERS) % 1.0, k) for k in range(LAYERS))   # far -> near
    view = n * TEX_BASE
    for p, k in phases:
        s = ZOOM ** p
        weight = math.sin(math.pi * p) ** 1.4
        if weight < 1e-3:
            continue
        # dst pixel -> texture coord: centred on the vanishing point, shrinking region as s grows
        k_scale = view / w / s
        c, sn = math.cos(roll) * k_scale, math.sin(roll) * k_scale
        tex_c = n / 2 + (k * 37 % 61 - 30) * (n / 4096)
        M = np.array([[c, -sn, tex_c - (c * vp[0] - sn * vp[1])],
                      [sn, c, tex_c - (sn * vp[0] + c * vp[1])]], np.float32)
        layer = cv2.warpAffine(textures[k], M, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                               borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        mask = (0.18 + 0.82 * smoothstep(0.0, 1.0, rr * s ** 0.8 / 0.9))[..., None]
        a = layer[..., 3:4] * (weight * 0.9 / 255.0) * mask
        haze = 1.0 - min(1.0, p * 1.6)             # far layers sink into the sky colour
        rgb = layer[..., :3] * (weight * 0.9) * mask
        rgb = rgb * (1 - 0.35 * haze) + SKY_HORIZON * a * 0.35 * haze
        out = out * (1 - a) + rgb
    out += np.array([190, 208, 236], np.float32) * np.exp(-(rr * 2.6) ** 2)[..., None] * 0.14
    out *= vignette * 0.9
    out += np.random.default_rng(f).normal(0, 0.9, out.shape[:2])[..., None].astype(np.float32)
    return np.clip(out, 0, 255).astype(np.uint8)


def init(a, tex, bg, vg):
    global args, textures, background, vignette
    cv2.setNumThreads(0)   # forked workers deadlock on OpenCV's inherited thread pool
    args, textures, background, vignette = a, tex, bg, vg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=3840)
    ap.add_argument("--seconds", type=float, default=12)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=22)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", default="public/videos/cloud-flight-loop-4k.mp4")
    ap.add_argument("--out-1080", default="public/videos/cloud-flight-loop.mp4")
    ap.add_argument("--still", type=int, help="render one frame to --out (png) and exit")
    a = ap.parse_args()
    a.height = a.width * 9 // 16
    a.frames = int(a.seconds * a.fps)

    n = 4096 if a.width >= 3000 else 2048
    print(f"building {LAYERS} textures @ {n}px", flush=True)
    tex = [build_texture(n, 1000 + k) for k in range(LAYERS)]
    bg, vg = build_background(a.width, a.height), build_vignette(a.width, a.height)

    if a.still is not None:
        init(a, tex, bg, vg)
        cv2.imwrite(a.out, cv2.cvtColor(render_frame(a.still), cv2.COLOR_RGB2BGR))
        return

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    enc = ["-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", "-an"]
    proc = subprocess.Popen(
        [ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{a.width}x{a.height}",
         "-r", str(a.fps), "-i", "-", "-filter_complex", "[0:v]split[a][b];[b]scale=1920:1080:flags=lanczos[c]",
         "-map", "[a]", *enc, a.out, "-map", "[c]", *enc, "-crf", "23", a.out_1080],
        stdin=subprocess.PIPE)
    with mp.get_context("fork").Pool(a.workers, initializer=init, initargs=(a, tex, bg, vg)) as pool:
        for i, frame in enumerate(pool.imap(render_frame, range(a.frames))):
            proc.stdin.write(frame.tobytes())
            if i % 15 == 0:
                print(f"frame {i}/{a.frames}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("done")


if __name__ == "__main__":
    main()

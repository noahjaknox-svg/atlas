#!/usr/bin/env python3
"""Render the seamless "cloud surfing" loop used as the portal backdrop.

Procedural cumulus sea: a tileable billow heightfield (rounded tops, creased valleys) is lit and
flown over/through with a voxel-space renderer. The camera advances exactly one texture period per
loop, so the last frame wraps to the first.

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

TAN_HALF = 0.78            # horizontal half-FOV tangent
HEIGHT = 70.0              # cloud relief, in texels at 4096px
HORIZON = 0.40             # horizon position, fraction of frame height
STEPS = 900
Z_NEAR, Z_FAR = 30.0, 3400.0
FOG_DIST = 1000.0

LIT = np.array([255, 250, 244], np.float32)
SHADOW = np.array([58, 74, 108], np.float32)
HAZE = np.array([150, 172, 205], np.float32)
SKY_TOP = np.array([18, 46, 98], np.float32)
CIRRUS = np.array([225, 232, 245], np.float32)
SUN_TINT = np.array([255, 235, 205], np.float32)
SUN = np.array([-0.55, 0.45, 0.70], np.float32)   # x, forward, up
SUN /= np.linalg.norm(SUN)

MIST_LAYERS = 5
MIST_ZOOM = 3.5

args = None
height_tex = rgb_tex = sky_streaks = None
mist_tex = []


def spectral_noise(n, rng, beta):
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = (rng.standard_normal((n, n)) + 1j * rng.standard_normal((n, n))).astype(np.complex64)
    spec *= (f ** -beta).astype(np.float32)
    spec[0, 0] = 0
    out = np.fft.ifft2(spec).real.astype(np.float32)
    return (out - out.mean()) / (out.std() + 1e-6)


def smoothstep(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def build_cloud_textures(n):
    """Billow heightfield + baked lighting, both tileable at n x n."""
    rng = np.random.default_rng(7)
    turb = np.abs(spectral_noise(n, rng, 1.6)) + 0.42 * np.abs(spectral_noise(n, rng, 1.25)) \
        + 0.10 * np.abs(spectral_noise(n, rng, 0.95))
    h = 1.0 - np.clip(turb / np.percentile(turb, 99.5), 0, 1)          # domes, sharp creases
    h = cv2.GaussianBlur(h ** 0.9, (0, 0), n / 1800)

    bumps = h + 0.012 * spectral_noise(n, rng, 0.7) + 0.02 * np.abs(spectral_noise(n, rng, 1.0))   # lighting-only detail
    slope = 1.6 * HEIGHT * (n / 4096.0) / 2.0
    dx = (np.roll(bumps, -1, 1) - np.roll(bumps, 1, 1)) * slope
    dz = (np.roll(bumps, -1, 0) - np.roll(bumps, 1, 0)) * slope
    nrm = np.stack([-dx, -dz, np.ones_like(h)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    lam = np.clip((nrm * SUN).sum(-1), 0, 1)
    shade = 0.3 + 0.7 * lam                                           # wrapped, soft lighting
    ao = np.clip(0.30 + 3.4 * (h - cv2.GaussianBlur(h, (0, 0), n / 90)) + 0.9 * h, 0, 1)
    light = smoothstep(0.05, 0.95, np.clip(shade * (0.45 + 0.55 * ao), 0, 1))
    rgb = SHADOW + (LIT - SHADOW) * light[..., None]
    return h.astype(np.float32), rgb.astype(np.float32)


def build_mist(n, seed):
    """Soft wisp layer (premultiplied RGBA) that zooms past the camera."""
    d = smoothstep(0.1, 1.5, spectral_noise(n, np.random.default_rng(seed), 1.7))
    d = cv2.GaussianBlur(d, (0, 0), n / 120) * 0.55
    rgba = np.empty((n, n, 4), np.float32)
    rgba[..., :3] = np.array([205, 218, 238], np.float32) * d[..., None]
    rgba[..., 3] = d * 255
    return np.clip(rgba, 0, 255).astype(np.uint8)


def build_sky_streaks(w, h):
    """Horizontally stretched cirrus, 0..1."""
    s = spectral_noise(512, np.random.default_rng(3), 1.7)
    s = cv2.resize(s, (w, h), interpolation=cv2.INTER_CUBIC)
    s = cv2.GaussianBlur(s, (0, 0), 3)
    return smoothstep(0.3, 1.8, s)


def sky_image(w, h, hz, t):
    ys = np.arange(h, dtype=np.float32)[:, None]
    up = np.clip((hz - ys) / max(hz, 1), 0, 1)                       # 0 at horizon, 1 at top
    sky = HAZE + (SKY_TOP - HAZE) * (up ** 0.55)[..., None]
    shift = int(w * 0.04 * math.sin(2 * math.pi * t))
    streak = np.roll(sky_streaks, shift, 1) * np.clip(1 - up * 0.9, 0, 1) * np.clip((hz - ys) / 40, 0, 1)
    return sky + (CIRRUS - sky) * (streak * 0.5)[..., None]


def add_mist(img, w, h, t):
    n = mist_tex[0].shape[0]
    yy = (np.arange(h, dtype=np.float32) / h - 0.62)[:, None]           # wisps hug the cloud tops
    xx = (np.arange(w, dtype=np.float32) / w - 0.5)[None, :]
    rr = np.sqrt((xx * 1.1) ** 2 + yy ** 2)
    band = smoothstep(-0.28, -0.04, yy) * 0.75                          # keep the sky clear
    for p, k in sorted(((t + k / MIST_LAYERS) % 1.0, k) for k in range(MIST_LAYERS)):
        s = MIST_ZOOM ** p
        weight = math.sin(math.pi * p) ** 1.3
        scale = 0.7 * n / w / s
        M = np.array([[scale, 0, n / 2 - scale * w / 2], [0, scale, n / 2 - scale * h * 0.62]], np.float32)
        layer = cv2.warpAffine(mist_tex[k], M, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                               borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        mask = ((0.1 + 0.9 * smoothstep(0.0, 1.0, rr * s ** 0.8 / 0.8)) * band)[..., None]
        a = layer[..., 3:4] / 255.0 * weight * mask
        img = img * (1 - a) + layer[..., :3] * (weight * mask)
    return img


def render_frame(f):
    w, h, frames = args.width, args.height, args.frames
    t = f / frames
    n = height_tex.shape[0]
    u = n / 4096.0
    hz = h * HORIZON + h * 0.012 * math.sin(4 * math.pi * t + 0.5)
    focal = (w / 2) / TAN_HALF

    cam_z = t * n
    cam_x = 260 * u * math.sin(2 * math.pi * t) + n * 0.37
    cam_h = (1.18 * HEIGHT + 16 * math.sin(4 * math.pi * t + 1.3)) * u
    roll = math.radians(1.6) * math.sin(2 * math.pi * t + 0.4)

    z = (Z_NEAR * (Z_FAR / Z_NEAR) ** (np.arange(STEPS, dtype=np.float32) / (STEPS - 1))) * u
    cols = ((np.arange(w, dtype=np.float32) - w / 2) / (w / 2))[None, :]
    wx = ((cam_x + cols * z[:, None] * TAN_HALF) % n).astype(np.float32)
    wz = np.broadcast_to((cam_z + z[:, None]) % n, wx.shape).astype(np.float32)
    hs = cv2.remap(height_tex, wx, wz, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    cs = cv2.remap(rgb_tex, wx, wz, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)

    fog = (1 - np.exp(-(z / u / FOG_DIST) ** 1.15))[:, None, None]
    cs = cs * (1 - fog) + HAZE * fog

    top = hz + (cam_h - hs * HEIGHT * u) * focal / z[:, None]
    top = np.clip(top, 0, h).astype(np.int32)
    run = np.minimum.accumulate(np.vstack([np.full((1, w), h, np.int32), top]), axis=0)
    si, ci = np.nonzero(run[1:] < run[:-1])           # steps that peek above everything nearer
    marker = np.full((h + 1, w), -1, np.int32)
    marker[run[1:][si, ci], ci] = si
    marker = marker[:h]
    rows = np.arange(h, dtype=np.int32)[:, None]
    ff = np.maximum.accumulate(np.where(marker >= 0, rows, -1), axis=0)
    ids = np.take_along_axis(marker, np.maximum(ff, 0), axis=0)
    ids[ff < 0] = -1

    img = cs[np.maximum(ids, 0), np.arange(w)[None, :]]
    img = np.where((ids >= 0)[..., None], img, sky_image(w, h, hz, t))
    img = cv2.GaussianBlur(img, (0, 0), 1.6 * w / 1920)
    img = add_mist(img, w, h, t)

    M = cv2.getRotationMatrix2D((w / 2, h / 2), math.degrees(roll), 1.04)
    img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - w * 0.36) / w) ** 2 + ((yy - h * 0.30) / h) ** 2 * 0.8)
    img += SUN_TINT * np.exp(-(r * 3.4) ** 2)[..., None] * 0.20
    vig = 1.0 - 0.45 * np.clip(((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2.6, 0, 1)
    img *= (vig * args.exposure)[..., None]
    img += np.random.default_rng(f).normal(0, 0.5, (h, w))[..., None].astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


def init(a, ht, rt, ss, mt):
    global args, height_tex, rgb_tex, sky_streaks, mist_tex
    cv2.setNumThreads(0)   # forked workers deadlock on OpenCV's inherited thread pool
    args, height_tex, rgb_tex, sky_streaks, mist_tex = a, ht, rt, ss, mt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=3840)
    ap.add_argument("--seconds", type=float, default=16)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=27)
    ap.add_argument("--workers", type=int, default=5)
    ap.add_argument("--exposure", type=float, default=0.7)
    ap.add_argument("--out", default="public/videos/cloud-flight-loop-4k.mp4")
    ap.add_argument("--out-1080", default="public/videos/cloud-flight-loop.mp4")
    ap.add_argument("--still", type=int, help="render one frame to --out (png) and exit")
    a = ap.parse_args()
    a.height = a.width * 9 // 16
    a.frames = int(a.seconds * a.fps)

    n = 2048   # same cloud texture at every output size, so 4K matches the 1080p look
    print(f"building cloud textures @ {n}px", flush=True)
    ht, rt = build_cloud_textures(n)
    ss = build_sky_streaks(a.width, a.height)
    mt = [build_mist(n // 2, 40 + k) for k in range(MIST_LAYERS)]

    if a.still is not None:
        init(a, ht, rt, ss, mt)
        cv2.imwrite(a.out, cv2.cvtColor(render_frame(a.still), cv2.COLOR_RGB2BGR))
        return

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    enc = ["-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", "-an"]
    proc = subprocess.Popen(
        [ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{a.width}x{a.height}",
         "-r", str(a.fps), "-i", "-", "-filter_complex", "[0:v]split[a][b];[b]scale=1920:1080:flags=lanczos[c]",
         "-map", "[a]", *enc, a.out, "-map", "[c]", *enc, "-crf", str(a.crf + 1), a.out_1080],
        stdin=subprocess.PIPE)
    with mp.get_context("fork").Pool(a.workers, initializer=init, initargs=(a, ht, rt, ss, mt)) as pool:
        for i, frame in enumerate(pool.imap(render_frame, range(a.frames))):
            proc.stdin.write(frame.tobytes())
            if i % 15 == 0:
                print(f"frame {i}/{a.frames}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("done")


if __name__ == "__main__":
    main()

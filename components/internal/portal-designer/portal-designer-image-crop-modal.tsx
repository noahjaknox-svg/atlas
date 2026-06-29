"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImageCropRect } from "@/lib/experience-content";
import { cn } from "@/lib/utils";

type AspectMode = "free" | "square" | "custom";

const CUSTOM_RATIO_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "16:9", w: 16, h: 9 },
  { label: "4:3", w: 4, h: 3 },
  { label: "3:2", w: 3, h: 2 },
  { label: "21:9", w: 21, h: 9 },
  { label: "5:4", w: 5, h: 4 },
];

function deriveInitialAspectMode(cropAspectRatio?: number): AspectMode {
  if (cropAspectRatio == null) return "free";
  if (Math.abs(cropAspectRatio - 1) < 0.01) return "square";
  return "custom";
}

function deriveInitialCustomRatio(cropAspectRatio?: number): { w: number; h: number } {
  if (cropAspectRatio == null || !Number.isFinite(cropAspectRatio) || cropAspectRatio <= 0) {
    return { w: 16, h: 9 };
  }
  for (const preset of CUSTOM_RATIO_PRESETS) {
    if (Math.abs(preset.w / preset.h - cropAspectRatio) < 0.02) {
      return { w: preset.w, h: preset.h };
    }
  }
  const scale = 100;
  return {
    w: Math.max(1, Math.round(cropAspectRatio * scale)),
    h: scale,
  };
}

function parseRatioInput(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(999, Math.round(n));
}

export function PortalDesignerImageCropModal({
  open,
  imageUrl,
  crop,
  cropAspectRatio,
  onClose,
  onSave,
}: {
  open: boolean;
  imageUrl: string;
  crop?: ImageCropRect;
  cropAspectRatio?: number;
  onClose: () => void;
  onSave: (next: { crop?: ImageCropRect; cropAspectRatio?: number }) => void;
}) {
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [aspectMode, setAspectMode] = useState<AspectMode>(() =>
    deriveInitialAspectMode(cropAspectRatio)
  );
  const [customWidth, setCustomWidth] = useState(() => deriveInitialCustomRatio(cropAspectRatio).w);
  const [customHeight, setCustomHeight] = useState(() => deriveInitialCustomRatio(cropAspectRatio).h);

  useEffect(() => {
    if (!open) return;
    setCropPos({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setAspectMode(deriveInitialAspectMode(cropAspectRatio));
    const ratio = deriveInitialCustomRatio(cropAspectRatio);
    setCustomWidth(ratio.w);
    setCustomHeight(ratio.h);
  }, [open, cropAspectRatio, imageUrl]);

  const customAspect = useMemo(() => {
    const w = parseRatioInput(String(customWidth));
    const h = parseRatioInput(String(customHeight));
    if (w == null || h == null) return undefined;
    return w / h;
  }, [customWidth, customHeight]);

  const cropAspect =
    aspectMode === "square" ? 1 : aspectMode === "custom" ? customAspect : undefined;

  const cropperKey =
    aspectMode === "custom"
      ? `custom-${customAspect ?? "invalid"}`
      : aspectMode;

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  if (!open || !imageUrl) return null;

  function handleSave() {
    let nextCrop: ImageCropRect | undefined;
    let nextAspect: number | undefined;
    if (croppedArea && croppedArea.width > 0) {
      const img = document.querySelector<HTMLImageElement>(".reactEasyCrop_Image");
      const naturalWidth = img?.naturalWidth ?? croppedArea.width;
      const naturalHeight = img?.naturalHeight ?? croppedArea.height;
      if (naturalWidth > 0 && naturalHeight > 0) {
        nextCrop = {
          x: croppedArea.x / naturalWidth,
          y: croppedArea.y / naturalHeight,
          width: croppedArea.width / naturalWidth,
          height: croppedArea.height / naturalHeight,
        };
        nextAspect = croppedArea.width / croppedArea.height;
      }
    } else if (crop) {
      nextCrop = crop;
      nextAspect = cropAspectRatio;
    }
    onSave({ crop: nextCrop, cropAspectRatio: nextAspect });
    onClose();
  }

  function applyPreset(w: number, h: number) {
    setAspectMode("custom");
    setCustomWidth(w);
    setCustomHeight(h);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-lg border border-atlas-border bg-atlas-surface">
        <div className="border-b border-atlas-border px-4 py-3">
          <p className="text-sm font-medium text-atlas-text">Edit Image</p>
          <p className="text-xs text-atlas-muted">Crop is CSS-only in preview; source file is unchanged.</p>
        </div>
        <div className="space-y-2 border-b border-atlas-border px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: "free" as const, label: "Free" },
                { id: "square" as const, label: "Square" },
                { id: "custom" as const, label: "Custom" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAspectMode(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  aspectMode === id
                    ? "bg-atlas-accent/15 text-atlas-text"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {aspectMode === "custom" ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-atlas-muted">Width</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={customWidth}
                    onChange={(e) => {
                      const next = parseRatioInput(e.target.value);
                      if (next != null) setCustomWidth(next);
                    }}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
                <span className="pb-2 text-sm text-atlas-muted">:</span>
                <div className="flex-1">
                  <Label className="text-xs text-atlas-muted">Height</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={customHeight}
                    onChange={(e) => {
                      const next = parseRatioInput(e.target.value);
                      if (next != null) setCustomHeight(next);
                    }}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {CUSTOM_RATIO_PRESETS.map(({ label, w, h }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyPreset(w, h)}
                    className={cn(
                      "rounded-md border border-atlas-border/60 px-2 py-1 text-xs text-atlas-muted hover:border-atlas-accent/40 hover:text-atlas-text",
                      customWidth === w && customHeight === h && "border-atlas-accent/50 bg-atlas-accent/10 text-atlas-text"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {customAspect == null ? (
                <p className="text-xs text-amber-300">Enter positive width and height values.</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative h-[320px] bg-black">
          {aspectMode !== "custom" || customAspect != null ? (
            <Cropper
              key={cropperKey}
              image={imageUrl}
              crop={cropPos}
              zoom={zoom}
              aspect={cropAspect}
              onCropChange={setCropPos}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-atlas-muted">
              Set a valid custom ratio to crop
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-atlas-border px-4 py-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-atlas-muted">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="min-w-0 flex-1"
            />
          </label>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={aspectMode === "custom" && customAspect == null}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

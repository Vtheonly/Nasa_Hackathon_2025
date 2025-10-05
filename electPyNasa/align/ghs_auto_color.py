#!/usr/bin/env python3
"""
ghs_auto_color.py
Automatic JWST NIRCam color compositing with GHS stretch and alignment.

Usage (CLI):
    python ghs_auto_color.py --r "path/to/red.tiff" --g "path/to/green.tiff" --b "path/to/blue.tiff" --output "path/to/output_base"
"""

import os
import numpy as np
import cv2
import astroalign
import tifffile
import argparse
import sys
from astropy.io import fits

# ---------- Helper functions transplanted from ghs_stretch_grayscale.py ----------

def load_tiff_auto(path, lower_pct=0.5, upper_pct=99.5):
    """Loads a FITS or TIFF file and returns a 2D numpy array."""
    if path.lower().endswith('.fits'):
        with fits.open(path) as hdul:
            img_data = None
            for h in hdul:
                if isinstance(h.data, np.ndarray) and h.data is not None:
                    if h.data.ndim >= 2:
                        img_data = h.data.astype(np.float64)
                        break
            if img_data is None:
                raise ValueError("No image data found in FITS file.")
    elif path.lower().endswith(('.tif', '.tiff')):
        img_data = tifffile.imread(path).astype(np.float64)
    else:
        raise ValueError(f"Unsupported input file type: {path}")

    # Select 2D plane
    if img_data.ndim > 2:
        img = np.max(img_data, axis=0)
    else:
        img = img_data

    # Replace NaN with min finite value
    img = np.nan_to_num(img, nan=np.nanmin(img[np.isfinite(img)]) if np.any(np.isfinite(img)) else 0.0)
    return img

def normalize(img, lower_pct=0.5, upper_pct=99.5):
    """Performs percentile normalization on an image."""
    lo = np.percentile(img, lower_pct)
    hi = np.percentile(img, upper_pct)
    if hi <= lo:
        lo = np.min(img)
        hi = np.max(img)
        if hi <= lo:
            hi = lo + 1.0

    norm = (img - lo) / (hi - lo)
    norm = np.clip(norm, 0.0, 1.0)
    return norm, (lo, hi)

def ghs_map(x, k=2.0, L=5.0, s=0.25):
    """Generalized Hyperbolic Stretch mapping function."""
    d = x - s
    denom = 1.0 + L * np.abs(d)
    y = s + k * d / denom
    return y

def smart_color_balance_user_friendly(r, g, b):
    """
    Placeholder for smart color balance function.
    This function is missing and needs to be implemented.
    """
    # This is a simple-minded implementation. A better one is needed.
    # For now, just stack the channels and convert to 8-bit.
    rgb = np.stack([r, g, b], axis=-1)
    rgb = np.clip(rgb, 0, 1)
    return (rgb * 255).astype(np.uint8)


def process_color_composite(red_path, green_path, blue_path, output_base):
    print(f"🔭 Running hs_auto_color.py...")

    # Load images
    print("\nLoading and applying GHS stretch to each channel...")
    try:
        blue_img_raw = load_tiff_auto(blue_path)
        green_img_raw = load_tiff_auto(green_path)
        red_img_raw = load_tiff_auto(red_path)
    except Exception as e:
        raise RuntimeError(f"Failed to load TIFF files: {e}")

    # Stretch
    b_norm, _ = normalize(blue_img_raw)
    g_norm, _ = normalize(green_img_raw)
    r_norm, _ = normalize(red_img_raw)
    b_stretched = ghs_map(b_norm)
    g_stretched = ghs_map(g_norm)
    r_stretched = ghs_map(r_norm)

    imgs = [b_stretched, g_stretched, r_stretched]

    # Alignment (middle channel as reference)
    ref_idx = 1 # Green channel
    ref_img = imgs[ref_idx]
    print("\nAligning channels (astroalign, green channel as reference)...")
    aligned_imgs = [None]*3
    aligned_imgs[ref_idx] = ref_img

    # Align Blue to Green
    try:
        aligned, _ = astroalign.register(imgs[0], ref_img)
        aligned_imgs[0] = aligned
        print("  ✅ Blue channel aligned successfully.")
    except Exception as e:
        print(f"  ⚠️ Alignment failed for blue channel: {e}. Using unaligned channel.")
        aligned_imgs[0] = imgs[0]

    # Align Red to Green
    try:
        aligned, _ = astroalign.register(imgs[2], ref_img)
        aligned_imgs[2] = aligned
        print("  ✅ Red channel aligned successfully.")
    except Exception as e:
        print(f"  ⚠️ Alignment failed for red channel: {e}. Using unaligned channel.")
        aligned_imgs[2] = imgs[2]

    # Correct RGB mapping: aligned_imgs is already [B, G, R]
    rgb32 = np.stack([aligned_imgs[2], aligned_imgs[1], aligned_imgs[0]], axis=-1)
    rgb32 = np.clip(rgb32, 0, 1).astype(np.float32)

    # Save scientific HDR 32-bit
    out_hdr = f"{output_base}_color_32bit.tiff"
    tifffile.imwrite(out_hdr, rgb32)
    print(f"\n✅ 32-bit color composite saved: {out_hdr}")

    # Save displayable 8-bit preview
    rgb_disp8 = smart_color_balance_user_friendly(aligned_imgs[2], aligned_imgs[1], aligned_imgs[0])
    out_disp = f"{output_base}_color_8bit_preview.tiff"
    cv2.imwrite(out_disp, cv2.cvtColor(rgb_disp8, cv2.COLOR_RGB2BGR))
    print(f"✅ Displayable 8-bit preview saved: {out_disp}")
    print(f"SUCCESS:{out_disp}") # Output for Electron

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a color composite from three TIFF files.")
    parser.add_argument('--r', required=True, help="Path to the RED channel TIFF file (e.g., F444W).")
    parser.add_argument('--g', required=True, help="Path to the GREEN channel TIFF file (e.g., F200W).")
    parser.add_argument('--b', required=True, help="Path to the BLUE channel TIFF file (e.g., F090W).")
    parser.add_argument('--output', required=True, help="Base name for the output files.")
    args = parser.parse_args()

    try:
        process_color_composite(args.r, args.g, args.b, args.output)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""
ghs_stretch_grayscale.py
Apply a Siril-like Generalized Hyperbolic Stretch (GHS) to a FITS image (JWST i2d.fits)
and save an auto-stretched grayscale TIFF.

Dependencies:
    pip install astropy numpy opencv-python

Usage (interactive):
    python ghs_stretch_grayscale.py
"""

import argparse
import sys
import numpy as np
import cv2
from astropy.io import fits
import os

# ---------- Helper transforms ----------
def ghs_map(x, k=2.0, L=5.0, s=0.25):
    """Generalized Hyperbolic Stretch mapping function."""
    d = x - s
    denom = 1.0 + L * np.abs(d)
    y = s + k * d / denom
    return y

def protect_shadows_and_highlights(x, y, sp=0.01, hp=0.98,
                                   shadow_blend_strength=0.85,
                                   highlight_compress_strength=0.85):
    """Protect shadows and highlights from over-stretching."""
    out = y.copy()
    if sp > 0:
        mask_shadow = (x <= sp)
        w = np.zeros_like(x)
        w[mask_shadow] = 1.0 - (x[mask_shadow] / (sp + 1e-12))
        out[mask_shadow] = (w[mask_shadow] * x[mask_shadow] * shadow_blend_strength
                            + (1 - w[mask_shadow] * shadow_blend_strength) * y[mask_shadow])
    if hp < 1.0:
        mask_high = (x >= hp)
        if np.any(mask_high):
            rel = (x[mask_high] - hp) / (1.0 - hp + 1e-12)
            attenuation = 1.0 - highlight_compress_strength * (rel ** 0.8)
            s = 0.25
            out[mask_high] = s + (out[mask_high] - s) * attenuation
    return out

# ---------- Main pipeline ----------
def process_fits_to_tiff(file_path, out_base,
                         stretch_k=2.0, local_L=5.0, symmetry_s=0.25,
                         shadow_protect=0.01, high_protect=0.98,
                         lower_pct=0.5, upper_pct=99.5):
    """Process a FITS or TIFF file and save a stretched grayscale TIFF."""
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext in ['.fits', '.fit']:
        with fits.open(file_path) as hdul:
            img_data = None
            for h in hdul:
                if isinstance(h.data, np.ndarray) and h.data is not None:
                    if h.data.ndim >= 2:
                        img_data = h.data.astype(np.float64)
                        break
            if img_data is None:
                raise ValueError("No image data found in FITS file.")
    elif file_ext in ['.tif', '.tiff']:
        img_data = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
        if img_data is None:
            raise IOError(f"Failed to load TIFF file: {file_path}")
        img_data = img_data.astype(np.float64)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")


    # Select 2D plane
    if img_data.ndim > 2:
        img = np.max(img_data, axis=0)
    else:
        img = img_data

    # Replace NaN with min finite value
    img = np.nan_to_num(img, nan=np.nanmin(img[np.isfinite(img)]) if np.any(np.isfinite(img)) else 0.0)

    # Percentile normalization
    lo = np.percentile(img, lower_pct)
    hi = np.percentile(img, upper_pct)
    if hi <= lo:
        lo = np.min(img)
        hi = np.max(img)
        if hi <= lo:
            hi = lo + 1.0

    norm = (img - lo) / (hi - lo)
    norm = np.clip(norm, 0.0, 1.0)

    # Apply GHS + protections
    y = ghs_map(norm, k=stretch_k, L=local_L, s=symmetry_s)
    y_prot = protect_shadows_and_highlights(norm, y, sp=shadow_protect, hp=high_protect,
                                            shadow_blend_strength=0.9, highlight_compress_strength=0.92)
    y_clipped = np.clip(y_prot, 0.0, 1.0)

    # Convert to 32-bit float (high dynamic range)
    out_img = y_clipped.astype(np.float32)

    # Save grayscale TIFF
    grayscale_file = f"{out_base}_grayscale.tif"
    if not cv2.imwrite(grayscale_file, out_img):
        raise IOError(f"Failed to save grayscale TIFF to {grayscale_file}")

    return {
        "grayscale": grayscale_file,
        "percentile_window": (lo, hi)
    }

# ---------- CLI ----------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Apply GHS stretch to a FITS or TIFF file.')
    parser.add_argument('--input', required=True, help='Input file path')
    parser.add_argument('--output', required=True, help='Output file base name')
    parser.add_argument('--k', type=float, default=2.0)
    parser.add_argument('--L', type=float, default=5.0)
    parser.add_argument('--s', type=float, default=0.25)
    parser.add_argument('--sp', type=float, default=0.01)
    parser.add_argument('--hp', type=float, default=0.98)
    
    args = parser.parse_args()

    try:
        res = process_fits_to_tiff(args.input, args.output,
                                   stretch_k=args.k, local_L=args.L, symmetry_s=args.s,
                                   shadow_protect=args.sp, high_protect=args.hp)
        # IMPORTANT: Report success back to the Electron app
        print(f"SUCCESS:{res['grayscale']}")
    except Exception as e:
        print(f"Error processing file: {e}", file=sys.stderr)
        sys.exit(1)

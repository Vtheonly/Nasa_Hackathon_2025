#!/usr/bin/env python3
"""
create_pyramid.py
A Python wrapper for the VIPS 'dzsave' command with advanced options.
Replicates the functionality of the NodeJS/Sharp DZI generator script.
"""
import argparse
import sys
import os
import subprocess

def run_command(command):
    """Executes a shell command and streams its output."""
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    for stdout_line in iter(process.stdout.readline, ""):
        print(stdout_line, end="")
    process.stdout.close()

    stderr_output = process.stderr.read()
    process.stderr.close()
    
    return_code = process.wait()
    
    if return_code != 0:
        raise subprocess.CalledProcessError(return_code, command, stderr=stderr_output)

def create_dzi_pyramid(input_path, output_base_dir, tile_size, overlap, img_format, quality):
    """
    Uses vips to create a DZI pyramid with a full set of options.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    try:
        subprocess.run(['vips', '--version'], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError("VIPS command-line tool ('vips') not found. Please ensure libvips is installed and in your system's PATH.")

    print(f"✅ VIPS found. Starting pyramid creation for: {os.path.basename(input_path)}")
    print(f"Options: Tile Size={tile_size}, Overlap={overlap}, Format={img_format}, Quality={quality}")

    base_name = os.path.splitext(os.path.basename(input_path))[0]
    image_output_dir = os.path.join(output_base_dir, base_name)
    
    # Base path for vips (e.g., ".../carina-nebula/carina-nebula")
    vips_output_path_base = os.path.join(image_output_dir, base_name)

    # VIPS handles quality for jpeg/webp by appending [Q=<value>] to the output name
    if img_format in ['jpeg', 'webp']:
        vips_output_path_base_with_quality = f"{vips_output_path_base}[Q={quality}]"
    else:
        vips_output_path_base_with_quality = vips_output_path_base

    final_dzi_path = vips_output_path_base + ".dzi"
    os.makedirs(image_output_dir, exist_ok=True)
    
    # --- Build the full VIPS command with all options ---
    command = [
        'vips',
        'dzsave',
        input_path,
        vips_output_path_base_with_quality,
        '--tile-size', str(tile_size),
        '--overlap', str(overlap),
        '--suffix', f'.{img_format}' # Use --suffix to control tile format
    ]

    print(f"Executing command: {' '.join(command)}")
    
    try:
        run_command(command)
        print("\n✅ DZI pyramid created successfully.")
        print(f"SUCCESS:{final_dzi_path}")
    except subprocess.CalledProcessError as e:
        print("\n❌ VIPS command failed.", file=sys.stderr)
        print(f"Error output:\n{e.stderr}", file=sys.stderr)
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a DZI pyramid from a large TIFF/JPEG using VIPS.")
    parser.add_argument('--input', required=True, help="Path to the large input TIFF or JPEG file.")
    parser.add_argument('--output', required=True, help="Path to the base folder where the image-named DZI directory will be created.")
    parser.add_argument('--tileSize', type=int, default=256, help="Tile size in pixels.")
    parser.add_argument('--overlap', type=int, default=1, help="Tile overlap in pixels.")
    parser.add_argument('--format', type=str, default='jpeg', choices=['jpeg', 'png', 'webp'], help="Image format for tiles.")
    parser.add_argument('--quality', type=int, default=90, help="Quality for jpeg/webp formats (1-100).")
    
    args = parser.parse_args()

    try:
        create_dzi_pyramid(args.input, args.output, args.tileSize, args.overlap, args.format, args.quality)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

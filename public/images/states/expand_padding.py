"""
Expands each SVG's viewBox to add proportional padding,
ensuring >= 6.25% padding on each side (= ~2.5px at 40px render size).

Run this on freshly-cropped+squared+colored SVGs.
EXPAND_FRACTION = 1/12 adds ~5.9% visual padding per side.
"""
import re
import os
import glob

STATES_DIR = os.path.dirname(os.path.abspath(__file__))
EXPAND_FRACTION = 1 / 12

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    vb_m = re.search(r'viewBox="([^"]+)"', content)
    if not vb_m:
        print(f"SKIP {filepath}: no viewBox")
        return

    parts = vb_m.group(1).split()
    if len(parts) != 4:
        print(f"SKIP {filepath}: unexpected viewBox format")
        return

    x, y, w, h = map(float, parts)
    size = max(w, h)
    cx = x + w / 2
    cy = y + h / 2

    # Shrink to 7/8 to undo 1/6 and re-apply 1/12
    new_size = round(size * (7 / 8), 3)
    new_x = round(cx - new_size / 2, 3)
    new_y = round(cy - new_size / 2, 3)
    new_vb = f"{new_x} {new_y} {new_size} {new_size}"

    content = re.sub(r'viewBox="[^"]+"', f'viewBox="{new_vb}"', content)
    content = re.sub(
        r'<rect fill="white" x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"',
        f'<rect fill="white" x="{new_x}" y="{new_y}" width="{new_size}" height="{new_size}"',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    name = os.path.basename(filepath)
    print(f"  {name}: viewBox={new_vb}")

def main():
    svgs = sorted(glob.glob(os.path.join(STATES_DIR, '*.svg')))
    print(f"Processing {len(svgs)} SVG files...")
    for svg in svgs:
        process(svg)
    print("Done.")

if __name__ == '__main__':
    main()

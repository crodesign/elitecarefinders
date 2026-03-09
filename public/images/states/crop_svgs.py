import re
import os
import math

STATES_DIR = os.path.dirname(os.path.abspath(__file__))
PADDING = 5

def parse_number(s):
    return float(s)

def tokenize_path(d):
    # Split path data into commands and numbers
    tokens = re.findall(r'[MLHVCSQTAZmlhvcsqtaz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    return tokens

def parse_path(d):
    """Parse SVG path d attribute and return all absolute coordinates."""
    tokens = tokenize_path(d)
    coords = []

    i = 0
    cmd = None
    cx, cy = 0.0, 0.0  # current position
    start_x, start_y = 0.0, 0.0  # start of subpath (for Z)

    def next_num():
        nonlocal i
        val = float(tokens[i])
        i += 1
        return val

    def has_num():
        return i < len(tokens) and re.match(r'^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$', tokens[i])

    while i < len(tokens):
        token = tokens[i]
        if re.match(r'[MLHVCSQTAZmlhvcsqtaz]', token):
            cmd = token
            i += 1
        # else implicit repeat of last command

        if cmd in ('M', 'm'):
            x = next_num()
            y = next_num()
            if cmd == 'm':
                x += cx
                y += cy
            cx, cy = x, y
            start_x, start_y = cx, cy
            coords.append((cx, cy))
            # subsequent pairs are lineto
            while has_num():
                x = next_num()
                y = next_num()
                if cmd == 'm':
                    x += cx
                    y += cy
                cx, cy = x, y
                coords.append((cx, cy))

        elif cmd in ('L', 'l'):
            x = next_num()
            y = next_num()
            if cmd == 'l':
                x += cx
                y += cy
            cx, cy = x, y
            coords.append((cx, cy))

        elif cmd in ('H', 'h'):
            x = next_num()
            if cmd == 'h':
                x += cx
            cx = x
            coords.append((cx, cy))

        elif cmd in ('V', 'v'):
            y = next_num()
            if cmd == 'v':
                y += cy
            cy = y
            coords.append((cx, cy))

        elif cmd in ('C', 'c'):
            x1 = next_num(); y1 = next_num()
            x2 = next_num(); y2 = next_num()
            x = next_num(); y = next_num()
            if cmd == 'c':
                x1 += cx; y1 += cy
                x2 += cx; y2 += cy
                x += cx; y += cy
            coords.append((x1, y1))
            coords.append((x2, y2))
            coords.append((x, y))
            cx, cy = x, y

        elif cmd in ('S', 's'):
            x2 = next_num(); y2 = next_num()
            x = next_num(); y = next_num()
            if cmd == 's':
                x2 += cx; y2 += cy
                x += cx; y += cy
            coords.append((x2, y2))
            coords.append((x, y))
            cx, cy = x, y

        elif cmd in ('Q', 'q'):
            x1 = next_num(); y1 = next_num()
            x = next_num(); y = next_num()
            if cmd == 'q':
                x1 += cx; y1 += cy
                x += cx; y += cy
            coords.append((x1, y1))
            coords.append((x, y))
            cx, cy = x, y

        elif cmd in ('T', 't'):
            x = next_num(); y = next_num()
            if cmd == 't':
                x += cx; y += cy
            coords.append((x, y))
            cx, cy = x, y

        elif cmd in ('A', 'a'):
            rx = next_num(); ry = next_num()
            rotation = next_num()
            large_arc = next_num()
            sweep = next_num()
            x = next_num(); y = next_num()
            if cmd == 'a':
                x += cx; y += cy
            coords.append((x, y))
            cx, cy = x, y

        elif cmd in ('Z', 'z'):
            cx, cy = start_x, start_y

    return coords

def process_svg(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract path d attribute
    m = re.search(r'd="([^"]+)"', content)
    if not m:
        print(f"SKIP {filepath}: no path d found")
        return

    path_d = m.group(1)

    try:
        coords = parse_path(path_d)
    except Exception as e:
        print(f"ERROR parsing {filepath}: {e}")
        return

    if not coords:
        print(f"SKIP {filepath}: no coords")
        return

    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    min_x = min(xs)
    min_y = min(ys)
    max_x = max(xs)
    max_y = max(ys)

    vb_x = min_x - PADDING
    vb_y = min_y - PADDING
    vb_w = (max_x - min_x) + 2 * PADDING
    vb_h = (max_y - min_y) + 2 * PADDING

    # Round to 3 decimal places
    vb_x = round(vb_x, 3)
    vb_y = round(vb_y, 3)
    vb_w = round(vb_w, 3)
    vb_h = round(vb_h, 3)

    new_viewbox = f"{vb_x} {vb_y} {vb_w} {vb_h}"

    new_content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{new_viewbox}">\n  <path fill="currentColor" d="{path_d}"/>\n</svg>\n'

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    name = os.path.basename(filepath)
    print(f"  {name}: viewBox={new_viewbox}")

def main():
    svg_files = sorted([f for f in os.listdir(STATES_DIR) if f.endswith('.svg')])
    print(f"Processing {len(svg_files)} SVG files...")
    for filename in svg_files:
        filepath = os.path.join(STATES_DIR, filename)
        process_svg(filepath)
    print("Done.")

if __name__ == '__main__':
    main()

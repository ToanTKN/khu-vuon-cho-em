"""Export browser-ready, orientation-correct photos; originals stay untouched."""
from pathlib import Path
import re
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
source = root / 'public/image/img_ky_niem'
archive = root / 'source-images/img_ky_niem'
output = source / 'web'
output.mkdir(parents=True, exist_ok=True)
files = [p for folder in (source, archive) if folder.exists() for p in folder.iterdir()
         if p.is_file() and re.fullmatch(r'\d+[a-z]', p.stem, re.I)]
files.sort(key=lambda p: (int(re.match(r'\d+', p.stem)[0]), p.stem))
for path in files:
    target = output / (path.stem.lower() + '.jpg')
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.save(target, 'JPEG', quality=87, optimize=True, progressive=True)
    print(f'{path.name} -> {target.name}: {target.stat().st_size // 1024} KB')

# Small contact sheet for checking framing and RAW previews.
sheet = Image.new('RGB', (1000, ((len(files) + 5) // 6) * 190), '#f6f0f7')
draw = ImageDraw.Draw(sheet)
for i, path in enumerate(files):
    with Image.open(output / (path.stem.lower() + '.jpg')) as image:
        image.thumbnail((154, 157))
        x, y = (i % 6) * 166, (i // 6) * 190
        sheet.paste(image, (x + (160 - image.width) // 2, y))
        draw.text((x + 8, y + 163), path.stem, fill='#544760')
sheet.save(root / 'memories-contact-preview.png')

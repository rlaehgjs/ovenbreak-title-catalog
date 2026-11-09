"""Validate only reviewed, already-public titles and their referenced images."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

root = Path(__file__).resolve().parents[1] / 'title-catalog'
html = (root / 'index.html').read_text(encoding='utf-8')
match = re.search(r'<script type="application/json" id="catalog-data">(.*?)</script>', html, re.S)
assert match, 'Embedded catalog missing'
rows = json.loads(match.group(1))['titles']
assert rows, 'Catalog empty'
now = datetime.now(timezone.utc)
ids, images = set(), set()
for row in rows:
    assert row['id'] not in ids, 'Duplicate internal ID'
    ids.add(row['id'])
    if row.get('list_visible_from_kst'):
        start = datetime.fromisoformat(row['list_visible_from_kst'])
        assert start.tzinfo is not None, 'Missing timezone'
        assert start <= now, f"Unreleased title: {row['id']}"
    for key in ('image', 'animated_image'):
        value = row.get(key)
        if not value:
            continue
        path = PurePosixPath(value)
        assert not path.is_absolute() and '..' not in path.parts
        assert path.parts[0] == 'images' and path.suffix in ('.png', '.webp')
        file = root / value
        assert file.is_file() and not file.is_symlink(), f'Missing image: {value}'
        images.add(value)
actual = {p.relative_to(root).as_posix() for p in (root / 'images').rglob('*') if p.is_file()}
assert actual == images, 'Unreferenced or missing images'
print(f'Validated {len(rows)} public titles and {len(images)} images.')

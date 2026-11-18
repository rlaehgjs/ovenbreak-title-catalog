"""Mirror validated public images; remove obsolete generated copies only."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2]
source=root/'title-catalog/images'
target=root/'web/public/catalog/images'
assert target.resolve()==root.resolve()/'web/public/catalog/images'
assert not target.is_symlink()
expected={p.relative_to(source) for p in source.rglob('*') if p.is_file()}
if target.exists():
 for p in target.rglob('*'):
  assert not p.is_symlink(), 'Unexpected link in generated assets'
  if p.is_file() and p.relative_to(target) not in expected:p.unlink()
shutil.copytree(source,target,dirs_exist_ok=True)

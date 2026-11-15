import hashlib,json,re,sys,zipfile
from pathlib import Path
asset=Path(sys.argv[1]);expected=sys.argv[2]
assert re.fullmatch('[a-f0-9]{64}',expected)
assert asset.stat().st_size<35000000 and hashlib.sha256(asset.read_bytes()).hexdigest()==expected
study=json.loads(Path('dist/study.json').read_text());rows={r['path']:r for r in study['images']}
with zipfile.ZipFile(asset) as z:
    entries=z.infolist();assert len(entries)==100 and len({i.filename for i in entries})==100
    assert {i.filename for i in entries}==set(rows)
    for i in entries:
        row=rows[i.filename];assert not i.is_dir() and i.file_size==row['bytes'] and i.file_size<1500000
        data=z.read(i);assert hashlib.sha256(data).hexdigest()==row['sha256']
        path=Path('dist')/i.filename;path.parent.mkdir(exist_ok=True);path.write_bytes(data)

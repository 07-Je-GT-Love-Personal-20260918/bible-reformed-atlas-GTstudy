"""Validate static links, fragment targets and complete source data."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json

root=Path(__file__).resolve().parent.parent
public=root/'dist'
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.ids=set();self.duplicates=[];self.links=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key=='id':
                if value in self.ids:self.duplicates.append(value)
                self.ids.add(value)
            if key in ('href','src') and value:self.links.append(value)

paths=[public/'index.html',public/'study.html',public/'overview.html',public/'nt-history.html',public/'gospel-harmony.html',public/'creeds.html',*[public/(x+'.html') for x in ['gospels','jesus-life','kings-chronicles','book-relations','pentateuch','historical-books','wisdom-books','prophets','epistles','study-paths']],*sorted((public/'books').glob('*.html'))]
cache={p.resolve():Page(p.read_text(encoding='utf-8')) for p in public.rglob('*.html')}
errors=[]
for path in paths:
    page=cache[path.resolve()]
    errors.extend(f'{path.name}: duplicate id {id}' for id in page.duplicates)
    for link in page.links:
        url=urlsplit(link)
        if url.scheme or url.netloc:continue
        target=(path.parent/unquote(url.path)).resolve() if url.path else path.resolve()
        if not target.exists():errors.append(f'{path.name}: missing {link}');continue
        if url.fragment and target.suffix=='.html':
            if unquote(url.fragment) not in cache[target].ids and url.fragment!='animated-atlas':
                errors.append(f'{path.name}: missing fragment {link}')
books=json.loads((root/'assets/books.json').read_text(encoding='utf-8'))['books']
assert len(books)==66
for book in books:
    for field in ['name','core','whole','context','why','what','local','christ','application']:
        assert book[field] and '???' not in book[field], (book['english'],field)
assert not (public/'CNAME').exists(), 'Stale Surge CNAME must not enter other deployments'
assert len({p.name[:2] for p in (public/'books').glob('[0-9][0-9]-*.html')})==66
depth=[line.split('|') for line in (root/'data/book-depth-v15.tsv').read_text(encoding='utf-8').splitlines()]
assert len(depth)==66 and all(len(row)==10 for row in depth)
assert [row[0] for row in depth]==[book['name'] for book in books]
assert len({row[7] for row in depth})==66 and len({row[9] for row in depth})==66
for number in range(1,67):
    path=sorted((public/'books').glob(f'{number:02d}-*.html'))[0]
    text=path.read_text(encoding='utf-8')
    assert text.count('class="path-step"')==3, path.name
    assert 'id="difficult"' in text and depth[number-1][7] in text, path.name
    assert 'window.print' not in text and 'fonts.googleapis' not in text, path.name
print('Static validation:',len(paths),'pages;',len(books),'complete book records;',len(errors),'link/fragment/id errors.')
for error in errors:print(error)
assert not errors

assert (public/"jesus-life.html").read_text(encoding='utf-8').count("class=\"life-event\"")==94
assert len(json.loads((root/"data/kings-v16.json").read_text(encoding='utf-8')))==39

canon=json.loads((root/'data/canon-comparisons-v17.json').read_text(encoding='utf-8'))
assert len(canon['focus'])==60
for group,expected in zip(canon['groups'],[5,12,5,17,21]):
    text=(public/(group['slug']+'.html')).read_text(encoding='utf-8')
    assert text.count('class="canon-book"')==expected
    assert text.count('class="path-step"')==expected*3
    assert 'groupAnswer' in text and 'canonSearch' in text
cases=(root/'data/canon-cases-v17.tsv').read_text(encoding='utf-8').splitlines()
assert len(cases)==22 and all(len(row.split('|'))==8 for row in cases)

links=[line.split('|') for line in (root/'data/book-links-v2.tsv').read_text(encoding='utf-8').splitlines()]
assert len(links)==66 and all(len(row)==7 for row in links)
for number in range(1,67):
    path=sorted((public/'books').glob(f'{number:02d}-*.html'))[0]
    text=path.read_text(encoding='utf-8')
    assert 'id="links"' in text and text.count('class="network-center"')==1
home=(public/'index.html').read_text(encoding='utf-8')
assert home.count('class="book-card library-book"')==66
assert home.count('class="atlas-header"')==1
assert len([r for r in (root/'data/acts-atlas-v2.tsv').read_text(encoding='utf-8').splitlines()])==46
harmony=json.loads((root/'data/gospel-harmony-v2.json').read_text(encoding='utf-8'))
seen=[]
for unit in harmony['units']:
    for witness in unit['witnesses']:
        seen.extend(witness['book']+':'+key for key in witness['verses'])
expected=[]
for code in ['MAT','MRK','LUK','JHN']:
    source=json.loads((public/'assets/gospel-source'/(code+'.json')).read_text(encoding='utf-8'))
    expected.extend(code+':'+key for key in source['verses'])
assert len(seen)==len(set(seen))==3768 and set(seen)==set(expected)
assert (public/'nt-history.html').read_text(encoding='utf-8').count('class="nt-event"')==46

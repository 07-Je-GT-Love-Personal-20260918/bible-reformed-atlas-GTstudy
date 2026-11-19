"""Reflow the supplied book into web paragraphs without page headers.

Run only when replacing the source PDF. The site build uses the checked-in JSON.
"""
import hashlib
import json
from pathlib import Path
import re

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'assets/panorama/original.pdf'
source = json.loads((ROOT / 'data/panorama-source.json').read_text(encoding='utf-8'))
assert hashlib.sha256(PDF.read_bytes()).hexdigest() == source['sha256']

def compact(text):
    return re.sub(r'\s+', '', text)

def paragraph_join(before, after):
    # Keep a space between Latin words at wrap boundaries. Join Chinese wraps.
    space = ' ' if re.search(r'[A-Za-z]$', before) and re.match(r'[A-Za-z]', after) else ''
    return before + space + after

result = {}
with fitz.open(PDF) as document:
    for entry in source['entries']:
        units = []
        for page_info in entry['pages']:
            number = page_info['page']
            page = document[number - 1]
            extracted = []
            for block in page.get_text('dict')['blocks']:
                for index, line in enumerate(block.get('lines', [])):
                    spans = line['spans']
                    text = ''.join(span['text'] for span in spans).strip()
                    x, y = line['bbox'][:2]
                    if not text or (y > page.rect.height * .87 and text == str(number)):
                        continue
                    extracted.append(text)
                    size = max(span['size'] for span in spans)
                    title_bounds = entry['start'] <= 9 or entry['start'] == 199
                    question_title = text in ('默想', '默 想', '默想与讨论', '默想题')
                    numbered = bool(re.match(r'^\d{1,2}[．、.]\s*\D', text))
                    if entry['start'] == 5:
                        kind = 'index'
                    elif question_title:
                        kind = 'reflection'
                    elif size >= 12 or (title_bounds and len(text) < 12 and not numbered):
                        kind = 'heading'
                    elif any(unit['kind'] == 'reflection' for unit in units) and numbered:
                        kind = 'question'
                    else:
                        kind = 'paragraph'
                    starts = not units or kind != 'paragraph'
                    if not starts:
                        prev = units[-1]
                        continuation = prev['kind'] in ('paragraph','question') and (
                            (index > 0 and x < 73) or (x < 69 and prev['kind'] == 'paragraph')
                            or (prev['kind'] == 'question' and x < 74)
                        )
                        starts = not continuation
                    if starts:
                        units.append({'kind':kind, 'page':number, 'text':text})
                    else:
                        units[-1]['text'] = paragraph_join(units[-1]['text'], text)
            expected = [s.strip() for s in page_info['text'].splitlines() if s.strip()]
            if expected and expected[0] == str(number):
                expected.pop(0)
            assert compact(''.join(extracted)) == compact(''.join(expected)), number
        result[str(entry['start'])] = units
(ROOT / 'data/panorama-flow.json').write_text(
    json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(result)} readings, {sum(map(len,result.values()))} text blocks')

"""AMOR 9: acquire with --fetch; normalize saved first-party observations offline."""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/amor-2026'
BASE = 'https://www.amorfestival.com/'
M100 = 'https://www.m100.cl/programacion/cine/9-amor-festival-internacional-de-cine-lgbt/'
TICKETS = 'https://ticketplus.cl/events/9-amor-festival-internacional-de-cine-lgbt'


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lines, self.main, self.skip = [], False, 0

    def handle_starttag(self, tag, attrs):
        if tag == 'main':
            self.main = True
        if tag == 'footer':
            self.main = False
        if tag in ('script', 'style'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == 'main':
            self.main = False
        if tag in ('script', 'style'):
            self.skip -= 1

    def handle_data(self, data):
        if self.main and not self.skip and data.strip():
            self.lines.append(' '.join(data.split()))


def acquire(root):
    assets = root / 'assets/amor-2026'
    assets.mkdir(parents=True, exist_ok=True)

    def get(pair):
        key, url, *allowed = pair
        path = assets / (key + ('.json' if 'wp-json' in url else '.html'))
        response = subprocess.run(['curl', '-L', '-sS', '--max-time', '30', '-w',
                                   '%{http_code}', '-o', str(path), url],
                                  capture_output=True, text=True, check=True)
        status = int(response.stdout)
        if status not in (allowed[0] if allowed else {200}):
            raise RuntimeError(f'{url}: HTTP {status}; previous observation preserved')
        return dict(id=key, url=url, status=status,
                    retrievedAt=dt.datetime.now(dt.timezone.utc).isoformat(),
                    path=str(path.relative_to(root)),
                    sha256=hashlib.sha256(path.read_bytes()).hexdigest())

    # Follow WordPress pagination, never assume a failed/empty page means removal.
    sources, films, page = [], [], 1
    while True:
        record = get((f'film-index-{page}', BASE + f'wp-json/wp/v2/pelicula?per_page=100&page={page}'))
        sources.append(record)
        batch = json.loads((root / record['path']).read_text())
        assert isinstance(batch, list) and (batch or page > 1)
        films.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    urls = [('home', BASE), ('inicio', BASE + 'inicio/'), ('m100', M100), ('ticketplus', TICKETS),
            ('old-programme', BASE + '?page_id=82', {200, 404})]
    urls.extend(('film-' + film['slug'], film['link']) for film in films)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        sources.extend(pool.map(get, urls))
    dump(assets / 'observations.json', dict(sources=sources))


def normalize(root=ROOT):
    assets = root / 'assets/amor-2026'
    observations = json.loads((assets / 'observations.json').read_text())
    sources = {s['id']: s for s in observations['sources']}
    for source in sources.values():
        assert hashlib.sha256((root / source['path']).read_bytes()).hexdigest() == source['sha256']
    assert sources['old-programme']['status'] == 404, 'Inspect the newly available full programme before publishing'
    # The venue timetable is visually transcribed below. Changed evidence needs reconciliation.
    for key, expected in {
        'm100': 'dc40b6c4073ebdb31a47702a3c32efb1ed2967045759137e88874d127644e8df',
        'ticketplus': '95fe95b950285bfb2bf37a3d4f75a93fde06aead07424cf5d6deb1d86e9ebe5b',
    }.items():
        assert sources[key]['sha256'] == expected, f'{key}: reconcile changed programme before publishing'
    indices = [s for key, s in sources.items() if key == 'film-index' or key.startswith('film-index-')]
    listings = [f for source in indices for f in json.loads((root / source['path']).read_text())]
    films = {}
    sections = {}
    for listing in listings:
        key = listing['slug']
        parser = Text()
        parser.feed((assets / f'film-{key}.html').read_text())
        lines = parser.lines
        assert len(lines) >= 10 and lines[7] == 'DIRECCIÓN', key
        section = listing['class_list']
        section = next(c.removeprefix('categoria_festival-') for c in section if c.startswith('categoria_festival-'))
        section = section.replace('_', '-')
        sections[section] = dict(label=lines[0], color='#f4cbe1', ink='#742c51')
        assert re.fullmatch(r'\d{4}', lines[3]) and re.fullmatch(r'\d+ min', lines[5]), key
        films[key] = dict(title=lines[1], year=int(lines[3]), countries=lines[4],
                          duration=int(lines[5].split()[0]), synopsis=lines[6],
                          director=lines[8], section=section, source=listing['link'])
    # This comma splits one person's surname on the festival page; venue credits the full name.
    films['corazon-danzante-cuando-el-amor-es-baile']['director'] = 'Arturo Nicolás Dávila Zelada'
    films['corazon-danzante-cuando-el-amor-es-baile']['directorSource'] = M100
    films['delay']['aliases'] = ['Delay']
    films['el-velo-o-veu']['originalTitle'] = 'O Véu'
    films['la-vida-de-una-mujer-la-vie-dune-femme']['originalTitle'] = 'La vie d’une femme'
    # Venue-only Lesboshort members. Preserve their source outside the festival's 20-film index.
    sections['lesboshort'] = dict(label='Lesboshort', color='#e3d7f5', ink='#563878')
    venue = (assets / 'm100.html').read_text()
    extras = [
        ('por-que-migran-los-peces', '¿Por qué migran los peces?', 'Camila Pujana, Stefanie Mora', 'Colombia', 2026, 14),
        ('algo-novo-que-contar', 'Algo novo que contar', 'Paula Pereira', 'España', 2025, 20),
        ('cielo-de-enero', 'Cielo de enero', 'Sofía Plesky', 'Argentina', 2026, 20),
        ('jugo-en-polvo', 'Jugo en Polvo', 'Sofía Flores Pinto', 'Chile', 2025, 19),
    ]
    for key, title, director, countries, year, duration in extras:
        assert title in html.unescape(venue), title
        films[key] = dict(title=title, director=director, countries=countries, year=year,
                          duration=duration, section='lesboshort', source=M100)
    programmes = {
        'guerrilla-1': ['la-hora-de-irse', 'terra', 'corazon-danzante-cuando-el-amor-es-baile', 'travesti-travesti-travesti', 'el-velo-o-veu'],
        'guerrilla-2': ['salsa', 'the-wind-in-ash', 'ultramarino', 'delay', 'grandma-nai-who-played-favorites'],
        'lesboshort': [row[0] for row in extras],
    }
    for key, members in programmes.items():
        films[key] = dict(title={'guerrilla-1': 'Guerrilla 1', 'guerrilla-2': 'Guerrilla 2', 'lesboshort': 'Lesboshort'}[key],
                          section='lesboshort' if key == 'lesboshort' else 'guerrilla', source=M100,
                          ticketUrl=TICKETS, duration=sum(films[m]['duration'] for m in members),
                          durationKind='sum',
                          components=[dict(filmId=m, **films[m]) for m in members])
    ticket_text = re.sub('<[^>]+>', ' ', (assets / 'ticketplus.html').read_text())
    assert '20' in ticket_text and '27 sin función' in html.unescape(ticket_text)
    events = [dict(id='amor-2026-m100-' + key, filmId=key, date=f'2026-11-{day}', start=1200,
                   roomId='m100-cine', venueId='m100', source=M100, ticketUrl=TICKETS)
              for day, key in [(25, 'guerrilla-1'), (26, 'guerrilla-2'), (28, 'lesboshort'), (29, 'playa-escondida')]]
    used = {m for members in programmes.values() for m in members} | {'playa-escondida'}
    pending = sorted(set(films) - used - set(programmes))
    dates = sorted({e['date'] for e in events})
    labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    schedule = dict(id='amor-2026', name='AMOR 9', edition=9, year=2026, city='Santiago',
                    updated=max(s['retrievedAt'] for s in sources.values())[:10], timeZone='America/Santiago',
                    sourceUrl=BASE, programUrl=M100, festivalDates=dict(start='2026-11-24', end='2026-11-29'),
                    regionalDates=dict(start='2026-12-01', end='2026-12-05'),
                    dateRange='25–29 nov 2026 · horarios publicados', programmeStatus='partial',
                    days=[dict(date=d, short=labels[dt.date.fromisoformat(d).weekday()][:3].upper(),
                               label=labels[dt.date.fromisoformat(d).weekday()], number=int(d[-2:])) for d in dates],
                    sections=sections, rooms=[dict(id='m100-cine', venueId='m100', venue='Matucana 100',
                                                  name='Cine M100', address='Av. Matucana 100, Estación Central')],
                    films=films, events=events, unscheduledFilmIds=pending)
    manifest = dict(**observations, officialFilmIds=[f['slug'] for f in listings],
                    venueOnlyFilmIds=[r[0] for r in extras], unscheduledFilmIds=pending,
                    limitations=['Complete timetable not available from the current festival site; legacy programme link returns 404.',
                                 'Only four M100 sessions have first-party confirmed dates, times and contents.',
                                 'Other Santiago venues and December regional extension announced without acquired timetable.'],
                    corrections=[dict(filmId='corazon-danzante-cuando-el-amor-es-baile', field='director',
                                      observed='Arturo Nicolás, Dávila Zelada', normalized='Arturo Nicolás Dávila Zelada', source=M100)])
    dump(root / 'assets/amor-2026-sources.json', manifest)
    dump(root / 'assets/amor-2026-programme-changes.json', dict(
        baseline=None, added=[e['id'] for e in events], changed=[], cancelled=[],
        awaitingTimetable=pending, completeProgramme=False))
    (root / 'data').mkdir(exist_ok=True)
    (root / 'data/amor-2026.js').write_text('// Generated by python3 scripts/import-amor-2026.py.\nexport default ' +
                                         json.dumps(schedule, ensure_ascii=False, indent=2) + ';\n')
    print(f'AMOR 9: {len(events)} sessions; {len(used)} scheduled films; {len(pending)} awaiting timetable.')


if __name__ == '__main__':
    args = argparse.ArgumentParser()
    args.add_argument('--fetch', action='store_true')
    if args.parse_args().fetch:
        # Validate the whole download and normalized products before replacing any saved file.
        with tempfile.TemporaryDirectory(prefix='amor-acquisition-') as directory:
            staged = Path(directory)
            acquire(staged)
            normalize(staged)
            for path in staged.rglob('*'):
                if path.is_file():
                    target = ROOT / path.relative_to(staged)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(path.read_bytes())
    else:
        normalize()

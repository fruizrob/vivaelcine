#!/usr/bin/env python3
"""Normalize preserved official FIDOCS 30 source snapshots; no network required.

Usage: python3 scripts/import-fidocs-2026.py RAW_DIRECTORY [REPO_DIRECTORY]
Raw snapshots are kept outside the public repository. Never fabricate part ends.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import sys


def lines(raw):
    return [m.group(1).strip() for m in re.finditer(r'^L\d+: ?(.*)$', raw, re.M)]


def url(raw):
    return re.search(r'https://[^\s)]+', raw).group()


def slug(text):
    import unicodedata
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def preserve_curated_metadata(path, films, events):
    """Keep curated identities and source-backed years through regeneration."""
    if not path.exists():
        return
    events_by_id = {event['id']:event for event in events}
    for line in path.read_text().splitlines():
        if '"letterboxd":' not in line and '"yearSource":' not in line:
            continue
        record = line.rstrip(',')
        if record.startswith('{'):
            previous = json.loads(record)
            if previous['id'] in events_by_id:
                copy_curated(previous, events_by_id[previous['id']])
        else:
            film_id, previous = next(iter(json.loads('{'+record+'}').items()))
            if film_id not in films:
                continue
            film = films[film_id]
            copy_curated(previous, film)
            components = {item['title']:item for item in previous.get('components',[])}
            for item in film.get('components',[]):
                copy_curated(components.get(item['title'],{}), item)


def copy_curated(previous, current):
    if 'letterboxd' in previous:
        current['letterboxd'] = previous['letterboxd']
    if previous.get('yearSource') and isinstance(previous.get('year'), int):
        current.update(year=previous['year'], yearSource=previous['yearSource'])


def main(raw_dir, repo):
    bundle = json.loads((raw_dir / 'source-snapshots-20261103.json').read_text())
    tickets = json.loads((raw_dir / 'all-ticket-links-20261103.json').read_text())['tickets']
    ticket_urls = {x['i']: re.search(r'https://www\.passline\.com/eventos/[^\s):]+', x['raw']).group() for x in tickets}
    palette = [('#f9d4c9','#c16850','#663f32'),('#dce8df','#558265','#284c36'),
               ('#eee3cc','#a18d61','#5c4c2b'),('#d6e8e8','#6a9597','#335b5e'),
               ('#f5e7b8','#b29950','#594e2d'),('#dbe7f3','#6385aa','#344e69'),
               ('#f1dce9','#ae7996','#633e53'),('#e6dff0','#8f78a8','#4e3d61'),
               ('#e4e9d5','#8c9667','#485438'),('#e7e5df','#918d80','#514d42')]
    labels = ['Competencia Nacional','Competencia Internacional','Funciones Especiales',
              'Fidocs expandido','Competencia Nacional de Cortos Emergentes','Foco Alan Berliner',
              'Foco Federico Luis','Foco Restauraciones','Foco Susana de Sousa Dias','Ganadoras']
    sections = {slug(label): dict(zip(['label','color','edge','ink'], [label,*colors])) for label,colors in zip(labels,palette)}
    spaces = [
        ('cineteca','cineteca','Cineteca Nacional de Chile','Cineteca Nacional','Cineteca Nacional de Chile'),
        ('ceina-cine','ceina','Centro Arte Alameda – CEINA','Arte Alameda – CEINA','Sala CEINA'),
        ('cine-uc','cine-uc','Sala de Cine UC','Cine UC','Sala de Cine UC'),
        ('sala-k','sala-k','Sala K / U. Mayor','Sala K','Sala K / U. Mayor'),
        ('paseo-bulnes','paseo-bulnes','Paseo Bulnes','Paseo Bulnes','Entre Condor y Mencía de los Nidos'),
        ('ceina-expo-2','ceina','Centro Arte Alameda – CEINA','CEINA','Sala Expo 2'),
    ]
    rooms = [dict(zip(['id','venueId','venue','shortVenue','name'], x)) for x in spaces]
    room_labels = dict(zip(['Cineteca Nacional de Chile','Centro Arte Alameda – Sala CEINA','Sala de Cine UC',
                            'Sala K / U. Mayor','Paseo Bulnes, entre Condor y Mencía de los Nidos','CEINA Sala Expo 2'],rooms))
    films, events, listings, shorts = {}, [], [], {}
    for i, detail in enumerate(bundle['details']):
        raw, source = detail['raw'], url(detail['raw'])
        text = lines(raw)
        heading = next(j for j,x in enumerate(text) if x.startswith('# '))
        section_label = text[heading-1]
        assert section_label in labels, (detail['title'], section_label)
        header = text[heading:next(j for j,x in enumerate(text) if 'SINOPSIS' in x)]
        film_id = source.rstrip('/').split('/')[-1]
        runtime = re.search(r'(\d+) Min\.', '\n'.join(header))
        director = ''
        if '##### Dirigida por:' in header:
            after = header[header.index('##### Dirigida por:')+1:]
            names = []
            for line in after:
                if line.startswith('*'): break
                if line.startswith('##### ') and 'Q&A' not in line:
                    names.append(line.removeprefix('##### ').lstrip(', '))
            director = ', '.join(names)
        metadata = [x.lstrip('* ').strip().removesuffix('|').strip() for x in header if x.endswith('|')]
        countries = metadata[0] if len(metadata)>1 else ''
        year = metadata[-1] if metadata else None
        film = {'title':detail['title'],'originalTitle':detail['title'],
                'duration':int(runtime[1]) if runtime else None,
                'director':director,'countries':countries,'section':slug(section_label),'source':source}
        if runtime: film['durationKind'] = 'published'
        if year: film['year'] = int(year) if year.isdigit() else year
        if i in ticket_urls: film['ticketUrl'] = ticket_urls[i]
        if any('FUNCIÓN GRATUITA' in x for x in header): film['free'] = True
        if any('Q&A' in x for x in header):
            film['qa'] = True
            film['note'] = 'Q&A al terminar la película; duración del conversatorio no publicada.'
        if section_label == 'Ganadoras':
            film['note'] = 'Película ganadora y duración por anunciar.'
        films[film_id] = film
        day = int(re.search(r'\* (\d+) Nov', '\n'.join(header))[1])
        date = f'2026-11-{day:02}'
        time_line = next(x for x in header if 'Hrs.' in x)
        starts = [int(h)*60+int(m) for h,m in re.findall(r'(\d{1,2})[:.](\d{2})', time_line)]
        room_label = next(label for label in room_labels if any('†'+label+'】' in x for x in header))
        room = room_labels[room_label]
        mapping = {'page':detail['page'],'title':detail['title'],'url':source,'filmId':film_id,
                   'publishedDate':date,'publishedStarts':starts,'publishedTimeLabel':time_line.lstrip('* '),
                   'publishedRoom':room_label,'eventIds':[]}
        if i in ticket_urls: mapping['ticketUrl'] = ticket_urls[i]
        if section_label == 'Competencia Nacional de Cortos Emergentes':
            shorts.setdefault((date, starts[0], room['id']), []).append((film_id,mapping))
        else:
            for n,start in enumerate(starts,1):
                event_id = f'fidocs-2026-{film_id}-{day:02}-{start:04}'
                event = {'id':event_id,'filmId':film_id,'date':date,'start':start,
                         'roomId':room['id'],'venueId':room['venueId'],'source':source}
                if i == 15:
                    event.update(duration=None,title=f'{film["title"]} — parte {n}',
                                 note='323 min corresponde a la obra completa. Duración de esta parte no publicada en la ficha.')
                if i == 19:
                    event.update(duration=[96,88,79][n-1],title=f'La Batalla de Chile — parte {["I","II","III"][n-1]}',
                                 durationSource='https://www.passline.com/eventos/la-batalla-de-chile-funciones-especiales-fidocs-30')
                    film['free'] = True
                events.append(event)
                mapping['eventIds'].append(event_id)
        listings.append(mapping)

    # Shared official ticket URL, date, start and room establish each shorts program.
    for n,((date,start,room_id),members) in enumerate(sorted(shorts.items()),1):
        urls = {films[film_id]['ticketUrl'] for film_id,_ in members}
        assert len(urls) == 1 and len(members) == 5
        film_id, ticket = f'cortos-emergentes-{n}', urls.pop()
        components = [dict(filmId=key, **{k:films[key][k] for k in ['title','duration','director','countries','year','source']}) for key,_ in members]
        films[film_id] = {'title':f'Cortos Emergentes — programa {n}','originalTitle':f'Competencia Nacional Cortos Emergentes {n}',
                          'duration':sum(x['duration'] for x in components),'durationKind':'sum',
                          'director':'Varios directores','countries':'Chile','section':slug(labels[4]),
                          'source':ticket,'ticketUrl':ticket,'components':components,'qa':True,
                          'note':'Incluye Q&A; duración del conversatorio no publicada.'}
        event_id = f'fidocs-2026-{film_id}'
        room = next(x for x in rooms if x['id']==room_id)
        events.append({'id':event_id,'filmId':film_id,'date':date,'start':start,'roomId':room_id,'venueId':room['venueId'],'source':ticket})
        for key,mapping in members:
            mapping.update(eventIds=[event_id],componentOf=film_id)

    # Embedded component metadata is published on the focus program's own page.
    for index in [32,33,35]:
        detail = bundle['details'][index]
        source = url(detail['raw'])
        key = source.rstrip('/').split('/')[-1]
        text = lines(detail['raw'])
        start = text.index('##### Películas de la función')
        components = []
        for j in range(start,len(text)):
            if not text[j].startswith('* Dir. '): continue
            preceding = [x for x in text[start:j] if x and not x.startswith(('*','【','#'))]
            title = preceding[-1]
            original = title
            if index == 33:
                title = preceding[-2]
            values = [x.lstrip('* ').strip() for x in text[j+1:] if x][:3]
            countries,year,duration = values
            components.append({'title':title,'originalTitle':original,'director':text[j].removeprefix('* Dir. '),
                               'countries':countries,'year':int(year),'duration':int(duration),'source':source})
        assert len(components) == (3 if index==35 else 5)
        film = films[key]
        film['components'] = components
        film['director'] = ', '.join(dict.fromkeys(x['director'] for x in components))
        film['countries'] = ', '.join(dict.fromkeys(y.strip() for x in components for y in x['countries'].split(',')))
        if index == 32:
            film['year'] = '2019–2026'
            film['note'] = 'La ficha publica 77 min para el programa; los cinco metrajes individuales suman 78 min. Se conserva el total publicado. Q&A posterior sin duración publicada.'

    events.sort(key=lambda x:(x['date'],x['start'],x['roomId'],x['id']))
    weekdays = [('LUN','Lunes'),('MAR','Martes'),('MIÉ','Miércoles'),('JUE','Jueves'),('VIE','Viernes'),('SÁB','Sábado'),('DOM','Domingo')]
    days = []
    for date in sorted({x['date'] for x in events}):
        day = dt.date.fromisoformat(date)
        short,label = weekdays[day.weekday()]
        days.append({'date':date,'short':short,'label':label,'number':day.day})
    data = {'id':'fidocs-2026','name':'FIDOCS 30','edition':30,'year':2026,'updated':'2026-11-03',
            'timeZone':'America/Santiago','sourceUrl':'https://fidocs.cl/programacion/',
            'dateRange':'13–19 nov 2026','dateRangeKind':'observed-screenings',
            'days':days,'sections':sections,'rooms':rooms,'films':films,'events':events}
    manifest = {'festivalId':data['id'],'retrieved':data['updated'],'sourceUrl':data['sourceUrl'],
                'method':'Four official program listing pages, every linked detail, and official outgoing ticket URLs.',
                'listingPages':[{'page':x['page'],'url':url(x['raw'])} for x in bundle['listings']],
                'listings':listings,'counts':{'listingRecords':len(listings),'publishedStarts':sum(len(x['publishedStarts']) for x in listings),
                                           'filmRecords':len(films),'screeningBlocks':len(events),'spaces':len(rooms),'dates':len(days)},
                'rules':['Same official ticket URL, room, date and start group shorts into one session.',
                         'Multipart starts retain individual runtimes only when officially published.',
                         'Q&A, presentations and breaks are excluded from runtime ends.',
                         'Unknown durations remain null; no estimated ends.'],
                'uncertainties':[{'filmId':bundle['details'][15]['raw'].split('/programacion/')[1].split('/')[0],
                                  'issue':'323-minute aggregate has three starts; individual part runtimes unverified. All three event durations are null.',
                                  'source':url(bundle['details'][15]['raw'])},
                                 {'filmId':'foco-federico-luis','issue':'Published program total 77 minutes differs from component sum 78 minutes; preserve published total.',
                                  'source':url(bundle['details'][32]['raw'])},
                                 {'filmId':'pelechian-project','issue':'Published header year range 1967–1992 excludes the listed 1966 Land of the People; both source values retained.',
                                  'source':url(bundle['details'][33]['raw'])},
                                 {'issue':'Three November 19 winner selections and runtimes are not announced.',
                                  'sources':[x['url'] for x in listings if films[x['filmId']]['section']=='ganadoras']},
                                 {'issue':'Date range describes observed screenings; full festival opening/closing announcement not independently verified.',
                                  'source':data['sourceUrl']}],
                'additionalSources':[{'url':'https://www.passline.com/eventos/la-batalla-de-chile-funciones-especiales-fidocs-30',
                                      'facts':'November 18 part starts 15:00/16:45/18:30; runtimes 96/88/79 min; free entry.'}],
                'snapshotSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in raw_dir.glob('*.json')}}
    assert len(listings)==51 and len(events)==48 and len(films)==53
    assert all(x['eventIds'] for x in listings)
    assert len({x['id'] for x in events})==len(events)
    for event in events:
        assert event['filmId'] in films and event['roomId'] in {x['id'] for x in rooms}
    preserve_curated_metadata(repo / 'data/fidocs-2026.js', films, events)
    repo.joinpath('data').mkdir(exist_ok=True, parents=True)
    repo.joinpath('assets').mkdir(exist_ok=True)
    # One record per line keeps large, read-only datasets reviewable and below 500 LOC.
    out = ['// Generated from official source snapshots by scripts/import-fidocs-2026.py.','export default {']
    for key,value in data.items():
        if key in ('days','rooms','events'):
            out += [compact(key)+':[', *[compact(x)+',' for x in value], '],']
        elif key in ('sections','films'):
            out += [compact(key)+':{', *[compact(k)+':'+compact(v)+',' for k,v in value.items()], '},']
        else: out.append(compact(key)+':'+compact(value)+',')
    out.append('};')
    repo.joinpath('data/fidocs-2026.js').write_text('\n'.join(out)+'\n')
    public = ['{']
    for key,value in manifest.items():
        if isinstance(value,list):
            public += [compact(key)+':[', *[compact(x)+',' for x in value[:-1]], *([compact(value[-1])] if value else []), '],']
        else: public.append(compact(key)+':'+compact(value)+',')
    public[-1] = public[-1].removesuffix(',')
    public.append('}')
    repo.joinpath('assets/fidocs-2026-sources.json').write_text('\n'.join(public)+'\n')
    print(compact(manifest['counts']))


if __name__ == '__main__':
    main(Path(sys.argv[1]),Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).resolve().parents[1])

"""Convert Dataset_Tempat_Magang (xlsx) to data/dataset.json for the engine.

Usage:
    pip install openpyxl
    python tools/xlsx_to_json.py path/to/Dataset_Tempat_Magang_revisi.xlsx data/dataset.json

Reads cached formula values, so open and save the workbook in Excel (or
LibreOffice) once after editing it, before running this script.
"""
import json
import sys
from datetime import date, datetime

import openpyxl


def num(v):
    if v is None or v == '':
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def text(v):
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.strftime('%Y-%m-%d')
    return str(v).strip()


def rows(ws):
    head = [text(c.value) for c in ws[1]]
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[0] is None:
            continue
        yield dict(zip(head, r))


def main(src, dst):
    wb = openpyxl.load_workbook(src, data_only=True)

    tempat = []
    for r in rows(wb['tempat_magang']):
        tempat.append({
            'tempatId': text(r['tempat_id']),
            'namaPerusahaan': text(r['nama_perusahaan']),
            'posisi': text(r['posisi']),
            'bidang': text(r['bidang_industri (C2)']),
            'lokasi': text(r['lokasi']),
            'modeKerja': text(r['mode_kerja']),
            'lat': num(r['latitude (C4)']),
            'lon': num(r['longitude (C4)']),
            'benefitFinansial': num(r['benefit_finansial (C5, juta Rp/bulan)']),
            'reputasi': num(r['reputasi (C6, 1–5)']),
            'statusAlternatif': text(r.get('status_alternatif')),
            'alasanDikeluarkan': text(r.get('alasan_dikeluarkan')),
            'sumberUrl': text(r['sumber_url']),
            'tanggalAkses': text(r['tanggal_akses']),
        })

    kebutuhan = []
    for r in rows(wb['kebutuhan_kompetensi']):
        kebutuhan.append({
            'kebutuhanId': text(r['kebutuhan_id']),
            'tempatId': text(r['tempat_id']),
            'kompetensiId': text(r['kompetensi_id']),
            'levelMinimum': int(r['level_minimum']),
            'jenis': text(r['jenis']).lower(),
        })

    kompetensi = [
        {'id': text(r['kompetensi_id']), 'nama': text(r['nama_kompetensi'])}
        for r in rows(wb['kompetensi'])
    ]

    out = {
        'meta': {
            'sumber': src.replace('\\', '/').split('/')[-1],
            'dibuat': date.today().isoformat(),
            'catatan': 'Dihasilkan oleh tools/xlsx_to_json.py; jangan diedit manual.',
        },
        'tempat': tempat,
        'kebutuhan': kebutuhan,
        'kompetensi': kompetensi,
    }
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'{len(tempat)} tempat, {len(kebutuhan)} kebutuhan, {len(kompetensi)} kompetensi -> {dst}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])

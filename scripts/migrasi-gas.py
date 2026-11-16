#!/usr/bin/env python3
"""Ubah data dari GAS (backup-unduh + list-*) jadi SQL untuk Supabase.
Pakai: python3 scripts/migrasi-gas.py /tmp/gas_data.json  > /tmp/migrasi.sql
Berkas /tmp/gas_list-kasbon.json, gas_list-gaji.json, gas_list-absensi.json, gas_list-audit.json, gas_kd.json harus ada."""
import json, sys
from datetime import datetime, timedelta, timezone

WIB = timezone(timedelta(hours=7))
def q(v):
    if v is None or v == "": return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"
def qs(v):  # teks: kosong tetap ''
    return "''" if v is None else q(v) if v != "" else "''"
def tgl_wib(v):  # ISO (tengah malam WIB tersimpan sbg UTC) -> YYYY-MM-DD
    if not v: return ""
    if len(v) == 10: return v
    return datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(WIB).strftime("%Y-%m-%d")
def load(p): return json.load(open(p))
def tabel(sheets, nama): 
    h, *rows = sheets[nama]
    return [dict(zip(h, r)) for r in rows]

out = []
def insert(t, kolom, rows, ident=False, konflik="do nothing"):
    if not rows: return
    vals = ",\n".join("(" + ",".join(r) + ")" for r in rows)
    ov = " overriding system value" if ident else ""
    out.append(f"insert into {t}({','.join(kolom)}){ov} values\n{vals}\non conflict {konflik};")

sheets = load(sys.argv[1])["data"]["sheets"]

insert("layanan", ["id","nama","harga","status","kategori"],
  [[q(r["id"]),q(r["nama"]),q(r["harga"]),q(r["status"]),qs(r["kategori"])] for r in tabel(sheets,"Layanan")], True)
out.append("select setval(pg_get_serial_sequence('layanan','id'), greatest((select coalesce(max(id),0) from layanan),1));")

pk = ["kode","nama","penjual","stok","skema","status","harga","harga_modal","persen_kapster","persen_penjual",
      "persen_eastville","nominal_kapster","nominal_penjual","nominal_eastville"]
insert("produk", pk, [[q(r[k]) if k not in ("penjual",) else qs(r[k]) for k in pk] for r in tabel(sheets,"Produk")])

trx = tabel(sheets,"Transaksi")
tk = ["id","waktu","tanggal","jam","metode","subtotal","diskon","total","bayar_tunai","bayar_qris","komisi_total","status",
      "dibuat_oleh_id","dibuat_oleh","void_alasan","void_oleh","void_waktu","lembur","manual","nota_buku","gratis"]
def trow(r):
    r = dict(r); r["tanggal"] = tgl_wib(r["tanggal"])
    teks = {"jam","void_alasan","void_oleh","lembur","manual","nota_buku","gratis","dibuat_oleh_id","dibuat_oleh"}
    return [qs(r[k]) if k in teks else q(r[k]) for k in tk]
insert("transaksi", tk, [trow(r) for r in trx])

ik = ["trx_id","tipe","ref_id","nama","qty","harga","kapster_id","kapster","komisi","komisi_persen"]
ids = {r["id"] for r in trx}
insert("transaksi_item", ik, [[q(str(r[k])) if k=="ref_id" else q(r[k]) for k in ik]
  for r in tabel(sheets,"TransaksiItem") if r["trx_id"] in ids], False, "do nothing")

ek = ["id","tanggal","kategori","deskripsi","jumlah","status","alasan_batal","dibuat_oleh","waktu"]
def erow(r):
    r = dict(r); r["tanggal"] = tgl_wib(r["tanggal"])
    return [qs(r[k]) if k in ("alasan_batal",) else q(r[k]) for k in ek]
insert("pengeluaran", ek, [erow(r) for r in tabel(sheets,"Pengeluaran")])

sk = ["waktu","kode","delta","stok_akhir","alasan","trx_id","oleh"]
insert("stok_mutasi", sk, [[q(r[k]) if k!="trx_id" else qs(r[k]) for k in sk] for r in tabel(sheets,"StokMutasi")])
lk = ["waktu","kode","produk","perubahan","oleh","alasan"]
insert("produk_log", lk, [[q(r[k]) for k in lk] for r in tabel(sheets,"ProdukLog")])
insert("pengaturan", ["key","value"], [[q(r["key"]), q(str(r["value"]))] for r in tabel(sheets,"Pengaturan")],
       False, "(key) do update set value = excluded.value")
insert("komisi_kapster", ["user_id","persen","diubah_oleh","waktu"],
  [[q(r["user_id"]),q(r["persen"]),q(r["diubah_oleh"]),q(r["waktu"])] for r in tabel(sheets,"KomisiKapster")])
tkk = ["id","waktu","tanggal","kasir_id","kasir","dari_waktu","jumlah_trx","penjualan","diskon","tunai_sistem",
       "qris_sistem","uang_fisik","selisih","catatan"]
def tkrow(r):
    r = dict(r); r["tanggal"] = tgl_wib(r["tanggal"])
    return [qs(r[k]) if k=="catatan" else q(r[k]) for k in tkk]
insert("tutup_kasir", tkk, [tkrow(r) for r in tabel(sheets,"TutupKasir")])

kd = load("/tmp/gas_kd.json")["data"]
kk = ["id","kode","nama","persen","berlaku_sampai","status","dibuat_oleh","waktu","dipakai","jenis","nilai"]
insert("kode_diskon", kk, [[q(r.get(k)) if k not in ("berlaku_sampai",) else qs(tgl_wib(r.get(k) or "")) for k in kk]
  for r in reversed(kd)])

for r in []: pass
kas = load("/tmp/gas_list-kasbon.json")["data"]
insert("kasbon", ["id","tanggal","user_id","nama","role","jumlah","status","catatan","dibuat_oleh","lunas_waktu"],
  [[q(r["id"]),qs(tgl_wib(r["tanggal"])),q(r["userId"]),q(r["nama"]),q(r["role"]),q(r["jumlah"]),q(r["status"]),
    qs(r["catatan"]),qs(r["dibuatOleh"]),q(r["lunasWaktu"])] for r in reversed(kas)])
gj = load("/tmp/gas_list-gaji.json")["data"]
insert("gaji", ["id","periode","user_id","nama","role","total_komisi","total_kasbon","gaji_bersih","status","tanggal_bayar","dibayar_oleh","catatan"],
  [[q(r["id"]),q(r["periode"]),q(r["userId"]),q(r["nama"]),q(r["role"]),q(r["totalKomisi"]),q(r["totalKasbon"]),
    q(r["gajiBersih"]),q(r["status"]),q(r["tanggalBayar"]),qs(r["dibayarOleh"]),qs(r["catatan"])] for r in reversed(gj)])
ab = load("/tmp/gas_list-absensi.json")["data"]
insert("absensi", ["id","waktu","tanggal","jam","user_id","nama","role","tipe","foto_url","status","catatan"],
  [[q(r["id"]),q(r["waktu"]),q(r["tanggal"]),qs(r["jam"]),q(r["userId"]),q(r["nama"]),q(r["role"]),qs(r["tipe"]),
    qs(r["fotoUrl"]),q(r["status"]),qs(r["catatan"])] for r in reversed(ab)])
au = load("/tmp/gas_list-audit.json")["data"]
insert("audit_log", ["waktu","user_id","nama_user","aksi","detail","alasan"],
  [[q(r["waktu"]),qs(r["userId"]),qs(r["namaUser"]),q(r["aksi"]),qs(r["detail"]),qs(r["alasan"])] for r in reversed(au)])
print("\n".join(out))

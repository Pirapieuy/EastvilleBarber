#!/usr/bin/env python3
"""Pindahkan foto absensi lama (data URL di kolom foto_url) ke Supabase Storage.
Butuh: npx supabase login. Aman dijalankan ulang (hanya baris yang masih data URL)."""
import base64, json, subprocess, urllib.request
REF = "zejaqgqpyrjvlarnxyaq"
def sql(q):
    r = subprocess.run(["npx","supabase","db","query","--linked","--yes",q], capture_output=True, text=True).stdout
    return json.loads(r[r.index("{"):r.rindex("}")+1]).get("rows", [])
keys = json.loads(subprocess.run(["npx","supabase","projects","api-keys","--project-ref",REF,"-o","json"], capture_output=True, text=True).stdout)
secret = next(k["api_key"] for k in keys if k["name"] == "service_role")
rows = sql("select id, user_id, tanggal, foto_url from absensi where foto_url like 'data:image/jpeg;base64,%'")
print(len(rows), "foto dipindah")
for r in rows:
    data = base64.b64decode(r["foto_url"].split(",", 1)[1])
    path = f"{r['tanggal']}/{r['user_id']}-{r['id']}.jpg"
    req = urllib.request.Request(f"https://{REF}.supabase.co/storage/v1/object/absensi/{path}", data=data, method="POST",
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "image/jpeg", "x-upsert": "true"})
    urllib.request.urlopen(req)
    url = f"https://{REF}.supabase.co/storage/v1/object/public/absensi/{path}"
    sql(f"update absensi set foto_url='{url}' where id='{r['id']}'")
print("selesai")

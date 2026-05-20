# 📝 To-Do List Pro (Hybrid Web & CLI Architecture)

Aplikasi manajemen tugas (To-Do List) full-stack dengan arsitektur **Hybrid** yang dapat diakses secara interaktif melalui dua jalur sekaligus: **Web Dashboard (Express.js)** dan **Terminal CLI (Inquirer.js)**. Seluruh data terintegrasi secara real-time pada satu database **PostgreSQL** yang diorkestrasi menggunakan **Docker Compose**.

## 🚀 Fitur Utama
- **Dual-Interface Access:** Kelola tugas Anda via browser di port `2000` atau langsung via terminal CLI secara bersamaan.
- **Modern Clean Web Dashboard:** Tampilan web minimalis berbasis *Slate & Blue UI* dilengkapi kartu statistik tugas (*Total, Selesai, Pending, Terlambat*) secara otomatis.
- **Real-time Synchronization:** Data yang diinput melalui web akan langsung terbaca di terminal CLI, dan sebaliknya.
- **Robust CRUD Operations:** Manajemen data aman dari celah *SQL Injection* menggunakan *parameterized queries*.
- **Persistent Storage:** Data tidak akan hilang saat kontainer Docker dimatikan berkat implementasi *Docker Named Volumes*.

## 🛠️ Arsitektur Teknologi & Port
- **Backend & Frontend Web:** Node.js v18 & Express.js (Port `2000`)
- **Database Engine:** PostgreSQL v16 (Port `5432`)
- **Orchestration:** Docker Compose

---

## 💻 Cara Menjalankan Aplikasi

### Prasyarat
Pastikan Anda sudah menginstal **Docker Desktop** di komputer Anda.

### Langkah deployment

1. **Jalankan Menggunakan Docker Compose**
   Eksekusi perintah ini di terminal folder proyek Anda:
   ```bash
   docker compose up --build

---

### Step 2: Push Kode Versi Web Dashboard ke GitHub

Sekarang, mari kita amankan seluruh perubahan besar ini (file `public/index.html`, update `app.js` port 2000, `docker-compose.yml`, dan `README.md`) ke repositori GitHub kamu.

Buka terminal baru di folder proyekmu (atau matikan dulu docker sejenak dengan `CTRL + C`), lalu jalankan tiga perintah Git andalan kita:

```bash
# 1. Tampung semua perubahan file baru
git add .

# 2. Berikan pesan commit yang mencerminkan fitur baru
git commit -m "feat: implementasi modern web dashboard di port 2000 dan arsitektur hybrid"

# 3. Dorong ke GitHub
git push
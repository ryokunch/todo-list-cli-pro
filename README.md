# 📝 To-Do List CLI Pro (Multi-Container Architecture)

Aplikasi manajemen tugas (To-Do List) berbasis Command Line Interface (CLI) interaktif yang dibangun menggunakan **Node.js (Inquirer.js)** dan terintegrasi dengan database **PostgreSQL**. Seluruh infrastruktur aplikasi ini telah diisolasi dan diorkestrasi menggunakan **Docker Compose** untuk memastikan kemudahan deployment.

## 🚀 Fitur Utama
- **Dashboard Statistik Real-time:** Menampilkan total tugas, tugas selesai, tugas pending, dan deteksi otomatis tugas yang terlambat (*overdue*) langsung menggunakan kueri agregasi SQL.
- **Robust CRUD Operations:** Manajemen tugas (Create, Read, Update, Delete) yang aman dari celah *SQL Injection* menggunakan *parameterized queries*.
- **Persistent Storage:** Data database tidak akan hilang saat kontainer Docker dimatikan berkat implementasi *Docker Named Volumes*.
- **Zero Local Dependencies:** Aplikasi dapat dijalankan di komputer mana pun tanpa perlu menginstal Node.js atau PostgreSQL secara lokal.

## 🛠️ Arsitektur Teknologi
- **Runtime Environment:** Node.js v18 (Alpine Linux Image)
- **Database:** PostgreSQL v16 (Alpine Linux Image)
- **Orchestration:** Docker Compose

---

## 💻 Cara Menjalankan Aplikasi

### Prasyarat
Pastikan Anda sudah menginstal [Docker Desktop](https://www.docker.com/products/docker-desktop/) di komputer Anda.

### Langkah-Langkah Deployment

1. **Clone Repositori**
   ```bash
   git clone [https://github.com/ryokunch/todo-list-cli-pro.git](https://github.com/ryokunch/todo-list-cli-pro.git)
   cd todo-list-cli-pro
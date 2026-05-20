const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const inquirer = require('inquirer');

const app = express();
const port = 2000;

// Middleware Web Express
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. KONFIGURASI KONEKSI DATABASE POSTGRESQL (Terpusat)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'ryo_user',
  password: process.env.DB_PASSWORD || 'rahasia_ryo',
  database: process.env.DB_NAME || 'todo_db',
  port: process.env.DB_PORT || 5432,
});

// 2. INISIALISASI TABEL & INDEX OTOMATIS SAAT APLIKASI DIJALANKAN
async function initDatabase() {
  // Query untuk membuat tabel jika belum ada
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      deadline DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'Belum Selesai'
    );
  `;
  await pool.query(createTableQuery);

  // OPTIMASI: Membuat Index pada kolom deadline untuk mempercepat query ORDER BY (Web & CLI)
  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos (deadline ASC);
  `;
  await pool.query(createIndexQuery);
}

// FORMAT TANGGAL KE YYYY-MM-DD AGAR RAPI
const formatTanggal = (dateStr) => {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
};

// =========================================================
//            [BAGIAN A] ENDPOINT API UNTUK WEB
// =========================================================

// API: Ambil semua tugas
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY deadline ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Tambah tugas baru
app.post('/api/todos', async (req, res) => {
  try {
    const { title, deadline } = req.body;
    await pool.query('INSERT INTO todos (title, deadline) VALUES ($1, $2)', [title, deadline]);
    res.status(201).json({ message: 'Tugas berhasil ditambah!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Tandai selesai
app.put('/api/todos/:id', async (req, res) => {
  try {
    await pool.query("UPDATE todos SET status = 'Selesai' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Tugas selesai!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Hapus tugas
app.delete('/api/todos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tugas dihapus!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================
//         [BAGIAN B] MENU UTAMA INTERAKTIF CLI (INQUIRER)
// =========================================================

async function mainMenu() {
  console.clear(); 
  console.log('===================================================');
  console.log('            APLIKASI TO-DO LIST PRO (HYBRID)       ');
  console.log('===================================================');

  try {
    const allQuery = await pool.query('SELECT * FROM todos');
    const todos = allQuery.rows;

    const totalTugas = todos.length;
    const selesai = todos.filter(t => t.status === 'Selesai').length;
    const belumSelesai = todos.filter(t => t.status === 'Belum Selesai').length;
    
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    
    const terlambat = todos.filter(t => {
      const tanggalDeadline = new Date(t.deadline);
      tanggalDeadline.setHours(0, 0, 0, 0);
      return t.status === 'Belum Selesai' && tanggalDeadline < hariIni;
    }).length;

    console.log(` 📊 STATISTIK DATA (REAL-TIME DB):`);
    console.log(`    ▪ Total Tugas     : ${totalTugas}`);
    console.log(`    ▪ ✅ Selesai      : ${selesai}`);
    console.log(`    ▪ ⏳ Belum Selesai: ${belumSelesai}`);
    console.log(`    ▪ 🚨 Terlambat    : ${terlambat}`);
    console.log('===================================================');

    const jawaban = await inquirer.prompt([
      {
        type: 'list',
        name: 'pilihan',
        message: 'Silakan pilih menu CLI:',
        choices: [
          '1. Lihat Semua Tugas (Urut Batas Waktu)',
          '2. Tambah Tugas Baru + Deadline',
          '3. Tandai Tugas Selesai',
          '4. Hapus Tugas',
          '5. Edit Tugas (Judul / Deadline)',
          '6. Keluar Mode CLI'
        ]
      }
    ]);

    switch (jawaban.pilihan) {
      case '1. Lihat Semua Tugas (Urut Batas Waktu)':
        await lihatTugas();
        break;
      case '2. Tambah Tugas Baru + Deadline':
        await tambahTugas();
        break;
      case '3. Tandai Tugas Selesai':
        await selesaiTugas();
        break;
      case '4. Hapus Tugas':
        await hapusTugas();
        break;
      case '5. Edit Tugas (Judul / Deadline)':
        await editTugas();
        break;
      case '6. Keluar Mode CLI':
        console.log('Keluar dari interface CLI. Server web tetap aktif berjalan! 🚀');
        break;
    }
  } catch (error) {
    console.error('🚨 Terjadi masalah koneksi database:', error.message);
    kembaliKeMenu();
  }
}

// 1. LIHAT TUGAS CLI
async function lihatTugas() {
  console.log('\n--- DAFTAR TUGAS ANDA (URUT DEADLINE) ---');
  const res = await pool.query('SELECT * FROM todos ORDER BY deadline ASC');
  const todos = res.rows;

  if (todos.length === 0) {
    console.log('📌 Belum ada tugas terdaftar.');
  } else {
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    todos.forEach((todo) => {
      const statusIcon = todo.status === 'Selesai' ? 'X' : ' ';
      const tanggalDeadline = new Date(todo.deadline);
      tanggalDeadline.setHours(0, 0, 0, 0);

      let labelWaktu = '';
      if (todo.status === 'Selesai') {
        labelWaktu = '✅ Berhasil Selesai';
      } else if (tanggalDeadline < hariIni) {
        labelWaktu = '🚨 TERLAMBAT / OVERDUE!';
      } else if (tanggalDeadline.getTime() === hariIni.getTime()) {
        labelWaktu = '⚠️ HARI INI!';
      } else {
        const selisihWaktu = tanggalDeadline.getTime() - hariIni.getTime();
        const selisihHari = Math.ceil(selisihWaktu / (1000 * 3600 * 24));
        labelWaktu = `⏳ sisa ${selisihHari} hari lagi`;
      }

      console.log(`${todo.id}. [${statusIcon}] ${todo.title}`);
      console.log(`   👉 Deadline: ${formatTanggal(todo.deadline)} [${labelWaktu}]`);
      console.log('---------------------------------');
    });
  }
  kembaliKeMenu();
}

// 2. TAMBAH TUGAS CLI
async function tambahTugas() {
  const jawaban = await inquirer.prompt([
    { type: 'input', name: 'judul', message: 'Masukkan nama/judul tugas baru:' },
    {
      type: 'input',
      name: 'deadline',
      message: 'Masukkan tenggat waktu (Format: YYYY-MM-DD):',
      validate: function(value) {
        const pass = value.match(/^\d{4}-\d{2}-\d{2}$/);
        if (pass) return true;
        return 'Format tanggal salah! Mohon gunakan format YYYY-MM-DD';
      }
    }
  ]);

  if (!jawaban.judul.trim()) {
    console.log('❌ Judul tidak boleh kosong!');
  } else {
    await pool.query('INSERT INTO todos (title, deadline) VALUES ($1, $2)', [jawaban.judul, jawaban.deadline]);
    console.log(`\n✅ Tugas "${jawaban.judul}" berhasil disimpan via CLI!`);
  }
  kembaliKeMenu();
}

// 3. TANDAI SELESAI CLI
async function selesaiTugas() {
  const res = await pool.query('SELECT * FROM todos ORDER BY deadline ASC');
  const todos = res.rows;

  if (todos.length === 0) {
    console.log('\n📌 Tidak ada tugas yang bisa diselesaikan.');
    return kembaliKeMenu();
  }

  const pilihanTugas = todos.map(t => ({
    name: `${t.id}. [${t.status === 'Selesai' ? 'X' : ' '}] ${t.title}`,
    value: t.id
  }));

  const jawaban = await inquirer.prompt([
    { type: 'list', name: 'idTugas', message: 'Pilih tugas yang sudah selesai:', choices: pilihanTugas }
  ]);

  await pool.query("UPDATE todos SET status = 'Selesai' WHERE id = $1", [jawaban.idTugas]);
  console.log(`\n👍 Tugas ID ${jawaban.idTugas} berhasil diupdate via CLI!`);
  kembaliKeMenu();
}

// 4. HAPUS TUGAS CLI
async function hapusTugas() {
  const res = await pool.query('SELECT * FROM todos ORDER BY deadline ASC');
  const todos = res.rows;

  if (todos.length === 0) {
    console.log('\n📌 Tidak ada tugas yang bisa dihapus.');
    return kembaliKeMenu();
  }

  const pilihanTugas = todos.map(t => ({
    name: `${t.id}. ${t.title} (${formatTanggal(t.deadline)})`,
    value: t.id
  }));

  const jawaban = await inquirer.prompt([
    { type: 'list', name: 'idTugas', message: 'Pilih tugas yang ingin dihapus permanen:', choices: pilihanTugas }
  ]);

  await pool.query("DELETE FROM todos WHERE id = $1", [jawaban.idTugas]);
  console.log(`\n🗑️ Tugas ID ${jawaban.idTugas} berhasil dihapus via CLI!`);
  kembaliKeMenu();
}

// 5. EDIT TUGAS CLI
async function editTugas() {
  const res = await pool.query('SELECT * FROM todos ORDER BY deadline ASC');
  const todos = res.rows;

  if (todos.length === 0) {
    console.log('\n📌 Tidak ada tugas yang bisa diedit.');
    return kembaliKeMenu();
  }

  const pilihanTugas = todos.map(t => ({
    name: `${t.id}. ${t.title} [Deadline: ${formatTanggal(t.deadline)}]`,
    value: t.id
  }));

  const jawaban = await inquirer.prompt([
    { type: 'list', name: 'idTugas', message: 'Pilih tugas yang ingin diubah:', choices: pilihanTugas },
    { type: 'input', name: 'judulBaru', message: 'Masukkan judul baru (Kosongkan jika tidak diubah):' },
    {
      type: 'input',
      name: 'deadlineBaru',
      message: 'Masukkan deadline baru YYYY-MM-DD (Kosongkan jika tidak diubah):',
      validate: function(value) {
        if (value === '') return true;
        const pass = value.match(/^\d{4}-\d{2}-\d{2}$/);
        if (pass) return true;
        return 'Format tanggal salah! Gunakan YYYY-MM-DD atau biarkan kosong.';
      }
    }
  ]);

  const todoSkg = todos.find(t => t.id === jawaban.idTugas);
  const judulFinal = jawaban.judulBaru.trim() !== '' ? jawaban.judulBaru : todoSkg.title;
  const deadlineFinal = jawaban.deadlineBaru.trim() !== '' ? jawaban.deadlineBaru : todoSkg.deadline;

  await pool.query('UPDATE todos SET title = $1, deadline = $2 WHERE id = $3', [judulFinal, deadlineFinal, jawaban.idTugas]);
  console.log(`\n✅ Data tugas ID ${jawaban.idTugas} berhasil diperbarui via CLI!`);
  kembaliKeMenu();
}

function kembaliKeMenu() {
  console.log('---------------------------------');
  inquirer.prompt([
    { type: 'input', name: 'lanjut', message: 'Tekan ENTER untuk kembali ke menu utama...' }
  ]).then(() => {
    mainMenu();
  });
}

// =========================================================
//                STARTING POINT JALUR SINKRON
// =========================================================
initDatabase().then(() => {
  // 1. Jalankan Server Web Express di Background
  app.listen(port, () => {
    console.clear();
    console.log(`🚀 Server Web berjalan di http://localhost:${port}`);
    console.log(`💡 Menyalakan Interface CLI terminal... Tunggu sebentar...\n`);
    
    // 2. Jalankan Menu Utama Inquirer CLI setelah server web siap
    setTimeout(() => {
      mainMenu();
    }, 1500);
  });
});


// =========================================================
//            [BAGIAN C] OPTIMASI: GRACEFUL SHUTDOWN
// =========================================================

// Fungsi untuk mematikan aplikasi secara bersih saat menerima sinyal stop dari Docker/Terminal
async function shutdown(signal) {
  console.log(`\n📢 Menerima sinyal ${signal}. Memulai proses pemutusan koneksi aman...`);
  
  try {
    // 1. Tutup pool koneksi database PostgreSQL
    console.log('⏳ Memutuskan koneksi pool ke PostgreSQL...');
    await pool.end();
    console.log('✅ Koneksi database berhasil diputus dengan bersih.');
    
    // 2. Keluar dari proses aplikasi Node.js
    console.log('👋 Sampai jumpa! Aplikasi berhenti dengan aman.');
    process.exit(0);
  } catch (err) {
    console.error('🚨 Eror saat mematikan aplikasi:', err.message);
    process.exit(1);
  }
}

// Mendengarkan sinyal interupsi (CTRL+C di terminal)
process.on('SIGINT', () => shutdown('SIGINT'));

// Mendengarkan sinyal terminasi (Perintah stop dari Docker Desktop / docker compose down)
process.on('SIGTERM', () => shutdown('SIGTERM'));
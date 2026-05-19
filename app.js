const inquirer = require('inquirer');
const { Pool } = require('pg');

// 1. KONFIGURASI KONEKSI DATABASE POSTGRESQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'ryo_user',
  password: process.env.DB_PASSWORD || 'rahasia_ryo',
  database: process.env.DB_NAME || 'todo_db',
  port: process.env.DB_PORT || 5432,
});

// 2. INISIALISASI TABEL OTOMATIS SAAT APLIKASI DIJALANKAN
async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      deadline DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'Belum Selesai'
    );
  `;
  await pool.query(createTableQuery);
}

// FORMAT TANGGAL KE YYYY-MM-DD AGAR RAPI DI CLI
const formatTanggal = (dateStr) => {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
};

// ================= MENU UTAMA INTERAKTIF =================

async function mainMenu() {
  console.clear(); 
  console.log('===================================================');
  console.log('             APLIKASI TO-DO LIST PRO               ');
  console.log('===================================================');

  try {
    // --- LOGIKA HITUNG STATISTIK LANGSUNG DARI SQL ---
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

    // Menampilkan Dashboard Mini ke Terminal
    console.log(` 📊 STATISTIK TUGAS ANDA saat ini:`);
    console.log(`    ▪ Total Tugas     : ${totalTugas}`);
    console.log(`    ▪ ✅ Selesai      : ${selesai}`);
    console.log(`    ▪ ⏳ Belum Selesai: ${belumSelesai}`);
    console.log(`    ▪ 🚨 Terlambat    : ${terlambat}`);
    console.log('===================================================');

    // Menampilkan Pilihan Menu
    const jawaban = await inquirer.prompt([
      {
        type: 'list',
        name: 'pilihan',
        message: 'Silakan pilih menu:',
        choices: [
          '1. Lihat Semua Tugas (Urut Batas Waktu)',
          '2. Tambah Tugas Baru + Deadline',
          '3. Tandai Tugas Selesai',
          '4. Hapus Tugas',
          '5. Edit Tugas (Judul / Deadline)',
          '6. Keluar Aplikasi'
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
      case '6. Keluar Aplikasi':
        console.log('Terima kasih sudah menggunakan aplikasi! 👋');
        await pool.end(); // Tutup koneksi pool DB sebelum exit
        process.exit();
    }
  } catch (error) {
    console.error('🚨 Terjadi masalah koneksi database:', error.message);
    kembaliKeMenu();
  }
}

// ================= FUNGSI FITUR-FITUR CRUDS =================

// 1. LIHAT TUGAS (Menggunakan ORDER BY pada SQL)
async function lihatTugas() {
  console.log('\n--- DAFTAR TUGAS ANDA (URUT DEADLINE) ---');
  
  // Mengurutkan langsung lewat kueri SQL agar efisien
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

// 2. TAMBAH TUGAS (INSERT INTO)
async function tambahTugas() {
  const jawaban = await inquirer.prompt([
    {
      type: 'input',
      name: 'judul',
      message: 'Masukkan nama/judul tugas baru:'
    },
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
    const query = 'INSERT INTO todos (title, deadline) VALUES ($1, $2)';
    await pool.query(query, [jawaban.judul, jawaban.deadline]);
    console.log(`\n✅ Tugas "${jawaban.judul}" berhasil disimpan ke PostgreSQL!`);
  }
  kembaliKeMenu();
}

// 3. TANDAI SELESAI (UPDATE)
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
    {
      type: 'list',
      name: 'idTugas',
      message: 'Pilih tugas yang sudah selesai:',
      choices: pilihanTugas
    }
  ]);

  const query = "UPDATE todos SET status = 'Selesai' WHERE id = $1";
  await pool.query(query, [jawaban.idTugas]);
  console.log(`\n👍 Tugas ID ${jawaban.idTugas} berhasil diselesaikan di database!`);
  kembaliKeMenu();
}

// 4. HAPUS TUGAS (DELETE)
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
    {
      type: 'list',
      name: 'idTugas',
      message: 'Pilih tugas yang ingin dihapus secara permanen:',
      choices: pilihanTugas
    }
  ]);

  const query = "DELETE FROM todos WHERE id = $1";
  await pool.query(query, [jawaban.idTugas]);
  console.log(`\n🗑️ Tugas ID ${jawaban.idTugas} berhasil dihapus dari PostgreSQL!`);
  kembaliKeMenu();
}

// 5. EDIT TUGAS (UPDATE DINAMIS)
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
    {
      type: 'list',
      name: 'idTugas',
      message: 'Pilih tugas yang ingin diubah:',
      choices: pilihanTugas
    },
    {
      type: 'input',
      name: 'judulBaru',
      message: 'Masukkan judul baru (Kosongkan jika tidak diubah):'
    },
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

  const query = 'UPDATE todos SET title = $1, deadline = $2 WHERE id = $3';
  await pool.query(query, [judulFinal, deadlineFinal, jawaban.idTugas]);
  
  console.log(`\n✅ Data tugas ID ${jawaban.idTugas} berhasil diperbarui di PostgreSQL!`);
  kembaliKeMenu();
}

// KEMBALI KE MENU UTAMA
function kembaliKeMenu() {
  console.log('---------------------------------');
  inquirer.prompt([
    {
      type: 'input',
      name: 'lanjut',
      message: 'Tekan ENTER untuk kembali ke menu utama...'
    }
  ]).then(() => {
    mainMenu();
  });
}

// STARTING POINT APLIKASI
async function startApp() {
  await initDatabase(); // Bikin tabel dulu jika belum ada
  await mainMenu();     // Buka menu utama
}

startApp();
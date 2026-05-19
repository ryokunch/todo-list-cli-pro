const fs = require('fs');
const inquirer = require('inquirer');
const path = './todo.json';

// Fungsi dasar membaca JSON
const readData = () => {
    try {
        const dataBuffer = fs.readFileSync(path);
        return JSON.parse(dataBuffer.toString());
    } catch (e) {
        return [];
    }
};

// Fungsi dasar menyimpan JSON
const saveData = (data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

// ================= MENU UTAMA INTERAKTIF =================

const mainMenu = () => {
    console.clear(); 
    console.log('===================================================');
    console.log('             APLIKASI TO-DO LIST PRO               ');
    console.log('===================================================');

    // --- LOGIKA HITUNG STATISTIK (DASHBOARD) ---
    const todos = readData();
    const totalTugas = todos.length;
    
    const selesai = todos.filter(t => t.status === 'Selesai').length;
    const belumSelesai = todos.filter(t => t.status === 'Belum Selesai').length;
    
    // Menghitung yang terlambat
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
    inquirer.prompt([
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
    ]).then((jawaban) => {
        switch (jawaban.pilihan) {
            case '1. Lihat Semua Tugas (Urut Batas Waktu)':
                lihatTugas();
                break;
            case '2. Tambah Tugas Baru + Deadline':
                tambahTugas();
                break;
            case '3. Tandai Tugas Selesai':
                selesaiTugas();
                break;
            case '4. Hapus Tugas':
                hapusTugas();
                break;
            case '5. Edit Tugas (Judul / Deadline)':
                editTugas();
                break;
            case '6. Keluar Aplikasi':
                console.log('Terima kasih sudah menggunakan aplikasi! 👋');
                process.exit();
        }
    });
};

// ================= FUNGSI FITUR-FITUR =================

// 1. LIHAT TUGAS (Dengan Deteksi Overdue & Sisa Hari)
const lihatTugas = () => {
    const todos = readData();
    console.log('\n--- DAFTAR TUGAS ANDA ---');
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
            console.log(`   👉 Deadline: ${todo.deadline} [${labelWaktu}]`);
            console.log('---------------------------------');
        });
    }
    kembaliKeMenu();
};

// 2. TAMBAH TUGAS (Dengan Validasi Tanggal YYYY-MM-DD)
const tambahTugas = () => {
    inquirer.prompt([
        {
            type: 'input',
            name: 'judul',
            message: 'Masukkan nama/judul tugas baru:'
        },
        {
            type: 'input',
            name: 'deadline',
            message: 'Masukkan tenggat waktu (Format: YYYY-MM-DD, contoh 2026-05-25):',
            validate: function(value) {
                const pass = value.match(/^\d{4}-\d{2}-\d{2}$/);
                if (pass) return true;
                return 'Format tanggal salah! Mohon gunakan format YYYY-MM-DD';
            }
        }
    ]).then((jawaban) => {
        if (!jawaban.judul.trim()) {
            console.log('❌ Judul tidak boleh kosong!');
        } else {
            const todos = readData();
            
            todos.push({
                id: 0,
                title: jawaban.judul,
                deadline: jawaban.deadline,
                status: 'Belum Selesai'
            });

            // Urutkan berdasarkan deadline terdekat
            todos.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

            // Reset urutan ID
            const updatedTodos = todos.map((todo, index) => {
                todo.id = index + 1;
                return todo;
            });

            saveData(updatedTodos);
            console.log(`✅ Tugas "${jawaban.judul}" berhasil ditambahkan!`);
        }
        kembaliKeMenu();
    });
};

// 3. TANDAI SELESAI
const selesaiTugas = () => {
    const todos = readData();
    if (todos.length === 0) {
        console.log('\n📌 Tidak ada tugas yang bisa diselesaikan.');
        return kembaliKeMenu();
    }

    const pilihanTugas = todos.map(t => `${t.id}. [${t.status === 'Selesai' ? 'X' : ' '}] ${t.title}`);

    inquirer.prompt([
        {
            type: 'list',
            name: 'tugasDipilih',
            message: 'Pilih tugas yang sudah selesai:',
            choices: pilihanTugas
        }
    ]).then((jawaban) => {
        const idTugas = parseInt(jawaban.tugasDipilih.split('.')[0]);
        const todo = todos.find(t => t.id === idTugas);
        
        if (todo) {
            todo.status = 'Selesai';
            saveData(todos);
            console.log(`👍 Tugas ID ${idTugas} berhasil diselesaikan!`);
        }
        kembaliKeMenu();
    });
};

// 4. HAPUS TUGAS
const hapusTugas = () => {
    const todos = readData();
    if (todos.length === 0) {
        console.log('\n📌 Tidak ada tugas yang bisa dihapus.');
        return kembaliKeMenu();
    }

    const pilihanTugas = todos.map(t => `${t.id}. ${t.title} (${t.deadline})`);

    inquirer.prompt([
        {
            type: 'list',
            name: 'tugasDihapus',
            message: 'Pilih tugas yang ingin dihapus secara permanen:',
            choices: pilihanTugas
        }
    ]).then((jawaban) => {
        const idTugas = parseInt(jawaban.tugasDihapus.split('.')[0]);
        const filteredTodos = todos.filter(t => t.id !== idTugas);
        
        const updatedTodos = filteredTodos.map((todo, index) => {
            todo.id = index + 1;
            return todo;
        });

        saveData(updatedTodos);
        console.log(`🗑️ Tugas berhasil dihapus dari file JSON!`);
        kembaliKeMenu();
    });
};

// 5. FITUR BARU: EDIT TUGAS (JUDUL & DEADLINE)
const editTugas = () => {
    const todos = readData();
    if (todos.length === 0) {
        console.log('\n📌 Tidak ada tugas yang bisa diedit.');
        return kembaliKeMenu();
    }

    const pilihanTugas = todos.map(t => `${t.id}. ${t.title} [Deadline: ${t.deadline}]`);

    inquirer.prompt([
        {
            type: 'list',
            name: 'tugasDiedit',
            message: 'Pilih tugas yang ingin diubah:',
            choices: pilihanTugas
        },
        {
            type: 'input',
            name: 'judulBaru',
            message: 'Masukkan judul baru (Kosongkan jika tidak ingin mengubah judul):'
        },
        {
            type: 'input',
            name: 'deadlineBaru',
            message: 'Masukkan deadline baru YYYY-MM-DD (Kosongkan jika tidak ingin mengubah deadline):',
            validate: function(value) {
                if (value === '') return true; // Boleh kosong jika tidak diubah
                const pass = value.match(/^\d{4}-\d{2}-\d{2}$/);
                if (pass) return true;
                return 'Format tanggal salah! Gunakan YYYY-MM-DD atau biarkan kosong.';
            }
        }
    ]).then((jawaban) => {
        const idTugas = parseInt(jawaban.tugasDiedit.split('.')[0]);
        const todo = todos.find(t => t.id === idTugas);

        if (todo) {
            // Jika user mengisi judul baru, timpa yang lama
            if (jawaban.judulBaru.trim() !== '') {
                todo.title = jawaban.judulBaru;
            }
            // Jika user mengisi deadline baru, timpa yang lama
            if (jawaban.deadlineBaru.trim() !== '') {
                todo.deadline = jawaban.deadlineBaru;
            }

            // Jika ada perubahan deadline, urutkan ulang tugasnya
            todos.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

            // Susun ulang ID agar tetap berurutan runtut
            const updatedTodos = todos.map((t, index) => {
                t.id = index + 1;
                return t;
            });

            saveData(updatedTodos);
            console.log(`\n✅ Data tugas ID ${idTugas} berhasil diperbarui!`);
        }
        kembaliKeMenu();
    });
};

// Fungsi pembantu agar aplikasi kembali ke menu utama
const kembaliKeMenu = () => {
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
};

// Jalankan aplikasi pertama kali
mainMenu();
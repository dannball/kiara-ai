// Fungsi untuk menambahkan jadwal manual
function addManualSchedule() {
    const input = document.getElementById('manual-schedule-input');
    const scheduleList = document.getElementById('manual-schedule-list');

    // Ambil nilai dari input
    const scheduleText = input.value.trim();

    // Cek jika input tidak kosong
    if (scheduleText) {
        // Ambil tanggal dan waktu saat ini
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = now.toLocaleDateString('id-ID', options); // Format tanggal
        const time = now.toLocaleTimeString('id-ID'); // Format waktu

        // Buat elemen list baru
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${scheduleText} - ${date}, ${time}</span>
            <button class="delete-button" onclick="deleteSchedule(this)">Hapus</button>
        `;
        scheduleList.appendChild(li); // Tambahkan ke daftar jadwal

        // Kosongkan input setelah menambah jadwal
        input.value = '';
    } else {
        alert('Silakan masukkan jadwal yang valid.');
    }
}

// Fungsi untuk menghapus jadwal
function deleteSchedule(button) {
    const li = button.parentElement; // Ambil elemen li dari tombol
    li.remove(); // Hapus elemen li
}
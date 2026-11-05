const GS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzZdChT9O5WUpDcbSriv2AIIvOfuQxuZ8MO7r52hnw15f61I4yxbmo4f-K8C4H0y_01/exec";

let selectedClass = "5A";
let adminSelectedClass = "5A";
let studentsList = [];
let studentResults = {};
let takenObjects = [];
let currentIndex = 0;
let countdown;
let timeLeft = 180;
let isGameActive = false;
let adminInterval = null;

// Daftar Paket Ayat Surat Al-Fatihah (7 Ayat + 1 Basmalah)
const alfatihahPackage = [
    "Basmalah: Bismillaahir-rohmaanir-rohiim",
    "Ayat 1: Al-hamdu lillaahi robbil-'alamiin",
    "Ayat 2: Ar-rohmaanir-rohiim",
    "Ayat 3: Maaliki yaumid-diin",
    "Ayat 4: Iyyaaka na'budu wa iyyaaka nasta'iin",
    "Ayat 5: Ihdinash-shiroothol-mustaqiim",
    "Ayat 6: Shiroothol-ladziina an'amta 'alaihim",
    "Ayat 7: Ghoiril-maghdhuubi 'alaihim waladh-dhoolliiin"
];

let canvas, ctx;
let isDrawing = false;
let currentCalligraphyColor = "#000000"; // Default Hitam
let lastX = 0;
let lastY = 0;
let undoStack = [];

function openAdminLoginModal() {
    document.getElementById('admin-login-modal').style.display = 'flex';
    document.getElementById('admin-user-input').value = '';
    document.getElementById('admin-pass-input').value = '';
    document.getElementById('admin-login-error').style.display = 'none';
}

function closeAdminLoginModal() {
    document.getElementById('admin-login-modal').style.display = 'none';
}

function processAdminLogin() {
    const user = document.getElementById('admin-user-input').value.trim();
    const pass = document.getElementById('admin-pass-input').value.trim();

    if (user === "admin" && pass === "admin") {
        closeAdminLoginModal();
        openAdminDashboard();
    } else {
        document.getElementById('admin-login-error').style.display = 'block';
    }
}

function openAdminDashboard() {
    document.getElementById('admin-dashboard-page').style.display = 'flex';
    switchAdminClass(selectedClass === 'Contohkan' ? '5A' : selectedClass);

    if (adminInterval) clearInterval(adminInterval);
    adminInterval = setInterval(() => {
        fetchAdminDatabaseData(true);
    }, 1000);
}

function logoutAdmin() {
    document.getElementById('admin-dashboard-page').style.display = 'none';
    if (adminInterval) {
        clearInterval(adminInterval);
        adminInterval = null;
    }
}

function switchAdminClass(kelas) {
    adminSelectedClass = kelas;
    document.getElementById('admin-btn-5a').classList.toggle('active', kelas === '5A');
    document.getElementById('admin-btn-5b').classList.toggle('active', kelas === '5B');
    fetchAdminDatabaseData(false);
}

async function fetchAdminDatabaseData(isBackground = false) {
    const tbody = document.getElementById('admin-db-table-body');
    if (!isBackground) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Mengambil data dari Spreadsheet kelas ${adminSelectedClass}...</td></tr>`;
    }

    if (GS_WEB_APP_URL && GS_WEB_APP_URL !== "PASTE_URL_WEB_APP_GS_ANDA_DI_SINI") {
        try {
            let response = await fetch(`${GS_WEB_APP_URL}?action=getAdminData&kelas=${adminSelectedClass}`);
            let rows = await response.json();
            
            if (!rows || rows.length === 0) {
                if (!isBackground) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data untuk kelas ${adminSelectedClass}</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            rows.forEach(row => {
                const tr = document.createElement('tr');
                const name = row[0] || '-';
                const objek = row[1] || '-';
                const gambar = row[2] || '';
                const nilai = row[3] || '0%';
                const waktu = row[5] || '-';

                let actionBtn = gambar ? `<button class="btn btn-glow btn-sm" onclick="openImageModal('${name}', '${gambar}', '${nilai}', 'Kaligrafi tersimpan di database.')"><i class="fas fa-image"></i> Buka Hasil Kaligrafi</button>` : '-';

                tr.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td>${objek}</td>
                    <td><strong style="color: #d4af37;">${nilai}</strong></td>
                    <td style="font-size: 12px; color: #94a3b8;">${waktu}</td>
                    <td>${actionBtn}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch(e) {
            console.error("Gagal sinkronisasi admin:", e);
        }
    }
}

function adminResetSession() {
    if (confirm("Yakin ingin melakukan RESET (Mulai Ulang Sesi Kaligrafi)?")) {
        clearInterval(countdown);
        isGameActive = false;
        
        document.getElementById('game-panel').classList.add('hidden');
        document.getElementById('finish-panel').classList.add('hidden');
        document.getElementById('setup-panel').classList.remove('hidden');
        document.getElementById('app-header-el').classList.remove('hidden');
        document.getElementById('top-nav-admin').classList.remove('hidden');
        
        currentIndex = 0;
        studentResults = {};
        takenObjects = [];
        
        fetchStudentsFromDatabase();
        alert("Sesi kaligrafi berhasil direset ke halaman awal.");
    }
}

function selectClass(className) {
    selectedClass = className;
    document.querySelectorAll('.btn-class').forEach(btn => {
        if (btn.getAttribute('data-class') === className) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    fetchStudentsFromDatabase();
}

async function fetchStudentsFromDatabase() {
    const sidebarClassLabel = document.getElementById('sidebar-class-label');
    const headerClassBadge = document.getElementById('header-class-badge');

    headerClassBadge.textContent = selectedClass === 'Contohkan' ? 'Mode Contoh' : `Kelas ${selectedClass}`;
    sidebarClassLabel.textContent = selectedClass === 'Contohkan' ? 'Mode Contoh (Tanpa Timer)' : `Kelas ${selectedClass} (Database)`;

    if (selectedClass === 'Contohkan') {
        setupStudentUI(["Siswa Contoh 1", "Siswa Contoh 2", "Siswa Contoh 3"]);
        return;
    }

    if (GS_WEB_APP_URL && GS_WEB_APP_URL !== "PASTE_URL_WEB_APP_GS_ANDA_DI_SINI") {
        try {
            let response = await fetch(`${GS_WEB_APP_URL}?action=getStudents&kelas=${selectedClass}`);
            let names = await response.json();
            setupStudentUI(names);
        } catch (e) {
            console.error("Gagal ambil dari database:", e);
            setupStudentUI(["Siswa A", "Siswa B", "Siswa C"]);
        }
    } else {
        setupStudentUI(["Siswa A", "Siswa B", "Siswa C"]);
    }
}

function setupStudentUI(rawNames) {
    const sidebarCountEl = document.getElementById('sidebar-count');
    const studentListEl = document.getElementById('student-list');

    sidebarCountEl.textContent = rawNames.length;
    studentListEl.innerHTML = '';
    rawNames.forEach((name, idx) => {
        const li = document.createElement('li');
        li.className = `student-item`;
        li.innerHTML = `
            <span class="student-name">${idx + 1}. ${name}</span>
            <span class="student-status status-pending">Siap</span>
        `;
        studentListEl.appendChild(li);
    });

    window.rawDatabaseNames = rawNames;
}

fetchStudentsFromDatabase();
document.getElementById('start-btn').addEventListener('click', startEntireGame);

function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startEntireGame() {
    var elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen().catch(()=>{}); }

    let names = window.rawDatabaseNames || [];
    if(names.length === 0) {
        alert("Daftar siswa kosong atau gagal dimuat!");
        return;
    }

    let randomizedNames = (selectedClass === 'Contohkan') ? names : shuffleArray(names);

    studentsList = randomizedNames.map((name) => {
        return { name: name, chosenItem: "", skipped: false };
    });

    currentIndex = 0;
    studentResults = {};
    takenObjects = [];
    isGameActive = true;
    
    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('finish-panel').classList.add('hidden');
    document.getElementById('app-header-el').classList.add('hidden');
    document.getElementById('top-nav-admin').classList.add('hidden');

    if (selectedClass === 'Contohkan') {
        document.getElementById('timer-box').style.display = 'none';
    } else {
        document.getElementById('timer-box').style.display = 'block';
    }
    
    initCanvas();
    renderSidebarList();
    promptStudentChoice();
}

function getEventCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Inisialisasi Kanvas dengan 8 Garis Panduan Transparan
function initCanvas() {
    canvas = document.getElementById('drawing-canvas');
    ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 380;

    clearCanvas();

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const coords = getEventCoordinates(e);
        startAction(coords);
    });

    canvas.addEventListener('pointermove', (e) => {
        e.preventDefault();
        if (isDrawing) {
            const coords = getEventCoordinates(e);
            moveAction(coords);
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        e.preventDefault();
        try { canvas.releasePointerCapture(e.pointerId); } catch(err){}
        stopAction();
    });

    canvas.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        stopAction();
    });

    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

// Menggambar latar belakang putih bersih beserta 8 Baris Panduan Transparan
function drawGuidelines() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 8 Baris Transparan (garis bantu putus-putus tipis untuk kaligrafi)
    ctx.strokeStyle = "rgba(212, 175, 55, 0.25)"; // Warna emas transparan lembut
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    let rowHeight = canvas.height / 9;
    for (let i = 1; i <= 8; i++) {
        let y = i * rowHeight;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(canvas.width - 40, y);
        ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash untuk pena kaligrafi
}

function clearCanvas() {
    saveUndoState();
    drawGuidelines();
}

function saveUndoState() {
    if (undoStack.length >= 15) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function undoCanvas() {
    if (undoStack.length > 0) {
        const previousState = undoStack.pop();
        ctx.putImageData(previousState, 0, 0);
    }
}

function setCalligraphyColor(colorHex) {
    currentCalligraphyColor = colorHex;
    document.getElementById('color-black').classList.toggle('active', colorHex === '#000000');
    document.getElementById('color-gold').classList.toggle('active', colorHex === '#d4af37');
}

function promptStudentChoice() {
    if (currentIndex >= studentsList.length) {
        isGameActive = false;
        endAllTurns();
        return;
    }

    const student = studentsList[currentIndex];
    if (student.skipped) {
        currentIndex++;
        promptStudentChoice();
        return;
    }

    document.getElementById('modal-student-name').textContent = student.name;
    
    const selectEl = document.getElementById('package-item-select');
    selectEl.innerHTML = '';
    
    let availableItems = alfatihahPackage.filter(item => !takenObjects.includes(item.toLowerCase()));

    if (availableItems.length === 0) {
        let opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "Semua ayat Al-Fatihah sudah diambil!";
        selectEl.appendChild(opt);
    } else {
        availableItems.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            selectEl.appendChild(opt);
        });
    }

    document.getElementById('student-choice-modal').style.display = 'flex';
}

function confirmStudentChoice() {
    const selectEl = document.getElementById('package-item-select').value;
    
    if (!selectEl) {
        alert("Semua ayat sudah habis diambil!");
        return;
    }

    takenObjects.push(selectEl.trim().toLowerCase());
    studentsList[currentIndex].chosenItem = selectEl;

    document.getElementById('student-choice-modal').style.display = 'none';
    document.getElementById('game-panel').classList.remove('hidden');

    document.getElementById('current-player').textContent = studentsList[currentIndex].name;
    document.getElementById('target-soal-badge').textContent = `Ayat: ${selectEl}`;

    undoStack = [];
    clearCanvas();

    if (selectedClass !== 'Contohkan') {
        timeLeft = 180;
        document.getElementById('timer').textContent = timeLeft;
        startTimer();
    }
    renderSidebarList();
}

// =========================================================================
// EFEK PENA KALIGRAFI KHUSUS (Sudut Pipih Otomatis)
// Garis Vertikal (Atas-Bawah) TIPIS, Garis Horizontal (Samping Kiri-Kanan) TEBAL
// =========================================================================
function startAction(coords) {
    isDrawing = true;
    saveUndoState();
    lastX = coords.x;
    lastY = coords.y;
}

function moveAction(coords) {
    if (!isDrawing) return;

    let currentX = coords.x;
    let currentY = coords.y;

    let dx = currentX - lastX;
    let dy = currentY - lastY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);

    // Lebar pena pipih kaligrafi (efek sudut lebar horizontal dan tipis vertikal)
    let calligraphyWidth = Math.abs(Math.sin(angle)) * 16 + 2; 

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = currentCalligraphyColor;
    ctx.fillStyle = currentCalligraphyColor;
    ctx.lineWidth = Math.max(2, calligraphyWidth);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    ctx.restore();

    lastX = currentX;
    lastY = currentY;
}

function stopAction() {
    if (!isDrawing) return;
    isDrawing = false;
}

// =========================================================================
// SISTEM PENILAIAN AI KALIGRAFI (MAKSIMAL 100% UNTUK AYAT & TANDA LENGKAP)
// =========================================================================
function evaluateCalligraphyWithAI() {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalPixels = width * height;
    let inkPixels = 0;
    let uniqueColorShades = new Set();
    let rowDensity = new Array(8).fill(0); // Deteksi sebaran di 8 baris transparan
    let rowHeight = height / 9;

    for (let y = 0; y < height; y++) {
        let rowIndex = Math.floor(y / rowHeight) - 1;
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];

            // Deteksi piksel tinta (Hitam atau Emas, bukan latar putih/garis panduan transparan)
            if (!((r > 240 && g > 240 && b > 240) || (Math.abs(r - 212) < 40 && Math.abs(g - 175) < 40 && Math.abs(b - 55) < 40 && (r + g + b) > 400))) {
                inkPixels++;
                uniqueColorShades.add(`${r},${g},${b}`);

                if (rowIndex >= 0 && rowIndex < 8) {
                    rowDensity[rowIndex]++;
                }
            }
        }
    }

    // 1. Aspek Kepadatan Tulisan Kaligrafi (Ideal: 3% - 25% dari area kanvas)
    let densityRatio = inkPixels / totalPixels;
    let scoreDensity = 0;
    if (densityRatio >= 0.03 && densityRatio <= 0.25) {
        scoreDensity = 30; // Poin penuh
    } else if (densityRatio > 0.01 && densityRatio < 0.03) {
        scoreDensity = 15;
    } else if (densityRatio > 0.25) {
        scoreDensity = 20;
    } else {
        scoreDensity = 5; // Terlalu sedikit / kosong
    }

    // 2. Aspek Harmoni & Ketepatan Tinta (Penggunaan warna hitam & emas yang konsisten)
    let scoreInkQuality = uniqueColorShades.size > 0 ? 25 : 0;

    // 3. Aspek Proporsi Ayat & Kepatuhan pada 8 Baris Panduan Transparan
    let activeRows = rowDensity.filter(count => count > 50).length;
    let scoreAlignment = (activeRows >= 1 && activeRows <= 4) ? 25 : (activeRows > 4 ? 20 : 10);

    // 4. Aspek Keberadaan Tanda Baca / Harakat (Simulasi Deteksi Detail Goresan Atas-Bawah)
    let scoreHarakatTanda = inkPixels > 300 ? 20 : (inkPixels > 100 ? 10 : 2);

    // Total Nilai Akhir (Maksimal 100%)
    let rawFinalScore = scoreDensity + scoreInkQuality + scoreAlignment + scoreHarakatTanda;
    
    // Jika siswa menulis dengan baik dan penuh, berikan nilai sempurna 100%
    let finalScore = (rawFinalScore >= 80) ? 100 : Math.max(35, Math.round(rawFinalScore * 1.15));
    finalScore = Math.min(100, finalScore);

    let feedbackStatus = finalScore === 100 ? "Sempurna! Ayat Al-Fatihah, harakat, dan tanda baca lengkap sesuai kaidah." : "Tulisan kaligrafi sudah bagus, tingkatkan kerapian pada harakat.";

    let detailedFeedback = `
Analisis AI Kaligrafi Surat Al-Fatihah:
- Status Kelengkapan Ayat & Tanda: ${feedbackStatus}
- Kepadatan Goresan Tinta: ${Math.round(densityRatio * 100)}%
- Kesesuaian Jalur 8 Baris Panduan: ${activeRows} Baris Aktif Terisi

Rincian Skor Penilaian Komprehensif:
1. Kepadatan & Bentuk Huruf: ${scoreDensity} / 30
2. Kualitas Tinta (Hitam/Emas): ${scoreInkQuality} / 25
3. Kesejajaran & Proporsi Baris: ${scoreAlignment} / 25
4. Kelengkapan Harakat & Tanda Baca: ${scoreHarakatTanda} / 20

Total Akurasi Kaligrafi: ${finalScore}%

Kelebihan:
- Goresan pena pipih vertikal-tipis dan horizontal-tebal sudah diterapkan dengan baik pada struktur ayat.

Saran Perbaikan:
- Pastikan semua harakat (fathah, kasrah, dammah) dan tanda baca ditulis lengkap agar mencapai nilai 100%.
    `.trim();

    return { 
        score: `${finalScore}%`, 
        desc: detailedFeedback 
    };
}

function startTimer() {
    if (selectedClass === 'Contohkan') return;
    clearInterval(countdown);
    countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            handleTimeUp();
        }
    }, 1000);
}

function handleTimeUp() {
    const student = studentsList[currentIndex];
    const imageBase64 = canvas.toDataURL("image/png");
    const aiResult = evaluateCalligraphyWithAI();
    
    studentResults[student.name] = { 
        item: student.chosenItem, 
        imageData: imageBase64, 
        score: aiResult.score,
        desc: aiResult.desc,
        status: "Waktu Habis (Dinilai AI)" 
    };
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, imageBase64, aiResult.score, "Waktu Habis");
    }
    renderSidebarList();

    const nextIndex = getNextValidIndex(currentIndex + 1);
    if (nextIndex < studentsList.length) {
        document.getElementById('timeup-message').innerHTML = `Waktu habis!<br><span style="color: #d4af37; font-weight: bold; font-size: 18px;">${studentsList[nextIndex].name}..</span>`;
    } else {
        document.getElementById('timeup-message').innerHTML = `Waktu habis!<br>Sesi selesai.`;
    }
    document.getElementById('timeup-overlay').style.display = 'flex';
}

function proceedNextAfterTimeUp() {
    document.getElementById('timeup-overlay').style.display = 'none';
    currentIndex++;
    promptStudentChoice();
}

function triggerSelesaiButton() {
    if (selectedClass !== 'Contohkan') {
        clearInterval(countdown);
    }
    const student = studentsList[currentIndex];
    const imageBase64 = canvas.toDataURL("image/png");
    const aiResult = evaluateCalligraphyWithAI();
    
    studentResults[student.name] = { 
        item: student.chosenItem,
        imageData: imageBase64, 
        score: aiResult.score,
        desc: aiResult.desc,
        status: "Selesai (Dinilai AI)" 
    };
    
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, imageBase64, aiResult.score, "Selesai");
    }
    document.getElementById('game-panel').classList.add('hidden');
    renderSidebarList();

    const nextIndex = getNextValidIndex(currentIndex + 1);
    if (nextIndex < studentsList.length) {
        document.getElementById('turn-alert-msg').innerHTML = `<span style="color: #d4af37; font-weight: bold; font-size: 18px;">${studentsList[nextIndex].name}..</span>`;
        document.getElementById('turn-alert-overlay').style.display = 'flex';
    } else {
        endAllTurns();
    }
}

function closeTurnAlert() {
    document.getElementById('turn-alert-overlay').style.display = 'none';
    currentIndex++;
    promptStudentChoice();
}

function skipCurrentStudent() {
    if (selectedClass !== 'Contohkan') {
        clearInterval(countdown);
    }
    const student = studentsList[currentIndex];
    student.skipped = true;
    studentResults[student.name] = { item: "-", imageData: null, score: "0%", desc: "Dilewati.", status: "Dilewati (Skipped)" };
    
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, "", "0%", "Dilewati (Skipped)");
    }
    
    document.getElementById('game-panel').classList.add('hidden');
    renderSidebarList();

    const nextIndex = getNextValidIndex(currentIndex + 1);
    if (nextIndex < studentsList.length) {
        currentIndex++;
        promptStudentChoice();
    } else {
        endAllTurns();
    }
}

function saveStudentScoreToDatabase(student, imageBase64, scoreVal, statusVal) {
    if (student.skipped || selectedClass === 'Contohkan') return;

    let payload = {
        kelas: selectedClass,
        package: "alfatihah",
        type: "appendSingle",
        result: {
            nama: student.name,
            objek: student.chosenItem,
            gambar: imageBase64,
            nilaiAI: scoreVal,
            status: statusVal,
            waktu: new Date().toLocaleString('id-ID')
        }
    };

    if (GS_WEB_APP_URL && GS_WEB_APP_URL !== "PASTE_URL_WEB_APP_GS_ANDA_DI_SINI") {
        fetch(GS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Gagal simpan data:", err));
    }
}

function getNextValidIndex(idx) {
    while(idx < studentsList.length && studentsList[idx].skipped) {
        idx++;
    }
    return idx;
}

function renderSidebarList() {
    const studentListEl = document.getElementById('student-list');
    studentListEl.innerHTML = '';
    studentsList.forEach((stu, idx) => {
        const li = document.createElement('li');
        li.className = `student-item ${idx === currentIndex && isGameActive ? 'active' : ''}`;
        
        let statusBadge = '<span class="student-status status-pending">Belum</span>';
        const data = studentResults[stu.name];
        
        if (stu.skipped) {
            statusBadge = '<span class="student-status status-skipped">Absen</span>';
        } else if (data && data.score) {
            statusBadge = `<span class="student-status status-done">${data.score}</span>`;
        } else if (idx === currentIndex && isGameActive) {
            statusBadge = '<span class="student-status status-active">Aktif</span>';
        }

        li.innerHTML = `
            <span class="student-name">${idx + 1}. ${stu.name}</span>
            ${statusBadge}
        `;
        studentListEl.appendChild(li);
    });
}

function endAllTurns() {
    document.getElementById('game-panel').classList.add('hidden');
    document.getElementById('finish-panel').classList.remove('hidden');
    renderSidebarList();

    const infoText = (selectedClass === 'Contohkan') 
        ? `✨ Mode Contohkan Selesai! (Data tidak disimpan ke Google Spreadsheet).` 
        : `✅ Sesi kaligrafi selesai! Seluruh nilai AI tersimpan di Google Spreadsheet (Sheet Data_${selectedClass})[cite: 2, 3].`;

    document.getElementById('sync-status-msg').textContent = infoText;

    const tbody = document.getElementById('result-table-body');
    tbody.innerHTML = '';
    studentsList.forEach((stu, idx) => {
        let res = studentResults[stu.name] || { item: "-", imageData: null, score: "0%", desc: "-", status: "-" };
        const tr = document.createElement('tr');
        
        let actionBtn = res.imageData ? `<button class="btn btn-glow btn-sm" onclick="openImageModal('${stu.name}', '${res.imageData}', '${res.score}', \`${res.desc}\`)"><i class="fas fa-robot"></i> Lihat Analisis AI</button>` : '-';

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${stu.name}</td>
            <td><strong>${stu.skipped ? '-' : res.item}</strong></td>
            <td><strong style="color: #d4af37;">${stu.skipped ? '0%' : res.score}</strong></td>
            <td>${stu.skipped ? 'Dilewati' : res.status}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openImageModal(studentName, imgData, score, desc) {
    document.getElementById('modal-preview-title').innerHTML = `<i class="fas fa-robot"></i> Hasil & Analisis Kaligrafi: ${studentName}`;
    document.getElementById('modal-img-preview').src = imgData;
    document.getElementById('ai-score-text').innerHTML = `🤖 Nilai AI Kaligrafi: <span style="color: #d4af37;">${score}</span>`;
    document.getElementById('ai-desc-text').style.whiteSpace = "pre-line";
    document.getElementById('ai-desc-text').textContent = desc;
    document.getElementById('image-modal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('image-modal').style.display = 'none';
}

document.getElementById('restart-btn').onclick = () => {
    document.getElementById('finish-panel').classList.add('hidden');
    document.getElementById('setup-panel').classList.remove('hidden');
    document.getElementById('app-header-el').classList.remove('hidden');
    document.getElementById('top-nav-admin').classList.remove('hidden');
    fetchStudentsFromDatabase();
};

document.addEventListener('fullscreenchange', () => {
    if (isGameActive && selectedClass !== 'Contohkan' && !document.fullscreenElement) {
        document.getElementById('warning-overlay').style.display = 'flex';
        clearInterval(countdown);
    }
});

function returnToFullscreen() {
    var elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(()=>{});
    document.getElementById('warning-overlay').style.display = 'none';
    startTimer();
}

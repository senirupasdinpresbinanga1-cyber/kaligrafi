const GS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzZdChT9O5WUpDcbSriv2AIIvOfuQxuZ8MO7r52hnw15f61I4yxbmo4f-K8C4H0y_01/exec";

let selectedClass = "5A";
let adminSelectedClass = "5A";
let studentsList = [];
let studentResults = {};
let currentIndex = 0;
let countdown;
let timeLeft = 180;
let isGameActive = false;
let adminInterval = null;

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
let currentTool = "brush"; 
let currentCalligraphyColor = "#000000"; 
let lastX = 0;
let lastY = 0;
let startX = 0;
let startY = 0;
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
                const status = row[3] || '-';
                const waktu = row[4] || '-';

                let actionBtn = gambar ? `<button class="btn btn-glow btn-sm" onclick="openImageModal('${name}', '${gambar}')"><i class="fas fa-image"></i> Buka Gambar</button>` : '-';

                tr.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td>${objek}</td>
                    <td><strong style="color: #16a34a;">${status}</strong></td>
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
        
        fetchStudentsFromDatabase();
        alert("Sesi kaligrafi berhasil direset.");
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
        
        if (currentTool === "fill") {
            saveUndoState();
            floodFill(Math.floor(coords.x), Math.floor(coords.y), hexToRgba(currentCalligraphyColor));
        } else {
            startAction(coords);
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        e.preventDefault();
        if (isDrawing && currentTool === "brush") {
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

function drawGuidelines() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
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
    ctx.setLineDash([]);
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

function setTool(tool) {
    currentTool = tool;
    document.getElementById('tool-brush').classList.toggle('active', tool === 'brush');
    document.getElementById('tool-fill').classList.toggle('active', tool === 'fill');
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
    
    alfatihahPackage.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        selectEl.appendChild(opt);
    });

    document.getElementById('student-choice-modal').style.display = 'flex';
}

function confirmStudentChoice() {
    const selectEl = document.getElementById('package-item-select').value;
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
// SISTEM GORESAN PENA KALIGRAFI: BELAH KETUPAT -> BULAT (SMOOTH) -> BELAH KETUPAT
// =========================================================================
function startAction(coords) {
    isDrawing = true;
    saveUndoState();
    startX = coords.x;
    startY = coords.y;
    lastX = coords.x;
    lastY = coords.y;

    // Cetak bentuk belah ketupat di awal tarikan (Start)
    drawDiamondStamp(startX, startY, 14);
}

function moveAction(coords) {
    if (!isDrawing) return;

    let currentX = coords.x;
    let currentY = coords.y;

    let dx = currentX - lastX;
    let dy = currentY - lastY;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // Menggunakan garis tebal bulat yang sangat rapat dan halus (smooth) menyambung antar titik
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = currentCalligraphyColor;
    ctx.fillStyle = currentCalligraphyColor;
    ctx.lineWidth = 12; // Ketebalan bagian tengah goresan
    ctx.lineCap = "round";  
    ctx.lineJoin = "round"; 

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

    // Cetak bentuk belah ketupat di akhir tarikan (End) untuk efek penutup (Fade Out)
    drawDiamondStamp(lastX, lastY, 14);
}

// Fungsi menggambar bentuk belah ketupat
function drawDiamondStamp(x, y, size = 14) {
    ctx.save();
    ctx.fillStyle = currentCalligraphyColor;
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4); // Rotasi 45 derajat membentuk belah ketupat
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
}

function hexToRgba(hex) {
    let bigint = parseInt(hex.replace('#',''), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return [r, g, b, 255];
}

function floodFill(startX, startY, fillColor) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    const startIndex = (startY * width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2] && startA === fillColor[3]) {
        return;
    }

    const queue = [[startX, startY]];
    const matchedColor = (r, g, b, a) => {
        return Math.abs(r - startR) < 30 && Math.abs(g - startG) < 30 && Math.abs(b - startB) < 30 && Math.abs(a - startA) < 30;
    };

    while (queue.length > 0) {
        const [x, y] = queue.pop();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        let westX = x;
        let eastX = x;

        while (westX >= 0 && matchedColor(data[(y * width + westX) * 4], data[(y * width + westX) * 4 + 1], data[(y * width + westX) * 4 + 2], data[(y * width + westX) * 4 + 3])) {
            westX--;
        }
        westX++;

        while (eastX < width && matchedColor(data[(y * width + eastX) * 4], data[(y * width + eastX) * 4 + 1], data[(y * width + eastX) * 4 + 2], data[(y * width + eastX) * 4 + 3])) {
            eastX++;
        }
        eastX--;

        for (let cx = westX; cx <= eastX; cx++) {
            let idx = (y * width + cx) * 4;
            data[idx] = fillColor[0];
            data[idx + 1] = fillColor[1];
            data[idx + 2] = fillColor[2];
            data[idx + 3] = fillColor[3];

            if (y > 0) {
                let upIdx = ((y - 1) * width + cx) * 4;
                if (matchedColor(data[upIdx], data[upIdx+1], data[upIdx+2], data[upIdx+3])) {
                    queue.push([cx, y - 1]);
                }
            }
            if (y < height - 1) {
                let downIdx = ((y + 1) * width + cx) * 4;
                if (matchedColor(data[downIdx], data[downIdx+1], data[downIdx+2], data[downIdx+3])) {
                    queue.push([cx, y + 1]);
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
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
    
    studentResults[student.name] = { 
        item: student.chosenItem, 
        imageData: imageBase64, 
        status: "Selesai (Waktu Habis)" 
    };
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, imageBase64, "Selesai (Waktu Habis)");
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
    
    studentResults[student.name] = { 
        item: student.chosenItem,
        imageData: imageBase64, 
        status: "Selesai" 
    };
    
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, imageBase64, "Selesai");
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
    studentResults[student.name] = { item: "-", imageData: null, status: "Dilewati (Skipped)" };
    
    if (selectedClass !== 'Contohkan') {
        saveStudentScoreToDatabase(student, "", "Dilewati (Skipped)");
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

function saveStudentScoreToDatabase(student, imageBase64, statusVal) {
    if (student.skipped || selectedClass === 'Contohkan') return;

    let payload = {
        kelas: selectedClass,
        package: "alfatihah",
        type: "appendSingle",
        result: {
            nama: student.name,
            objek: student.chosenItem,
            gambar: imageBase64,
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
        } else if (data && data.status) {
            statusBadge = `<span class="student-status status-done">Selesai</span>`;
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
        : `✅ Sesi kaligrafi selesai! Seluruh hasil tersimpan di Google Spreadsheet (Sheet Data_${selectedClass})[cite: 2, 3].`;

    document.getElementById('sync-status-msg').textContent = infoText;

    const tbody = document.getElementById('result-table-body');
    tbody.innerHTML = '';
    studentsList.forEach((stu, idx) => {
        let res = studentResults[stu.name] || { item: "-", imageData: null, status: "Belum" };
        const tr = document.createElement('tr');
        
        let actionBtn = res.imageData ? `<button class="btn btn-glow btn-sm" onclick="openImageModal('${stu.name}', '${res.imageData}')"><i class="fas fa-image"></i> Lihat Gambar</button>` : '-';

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${stu.name}</td>
            <td><strong>${stu.skipped ? '-' : res.item}</strong></td>
            <td><strong style="color: #16a34a;">${stu.skipped ? 'Dilewati' : res.status}</strong></td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openImageModal(studentName, imgData) {
    document.getElementById('modal-preview-title').innerHTML = `<i class="fas fa-image"></i> Hasil Kaligrafi: ${studentName}`;
    document.getElementById('modal-img-preview').src = imgData;
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

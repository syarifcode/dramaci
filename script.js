// Konfigurasi Proxy
const API_BASE = ""; 

// State Global
let currentHomeBookPage = 1;
let currentCategoryPage = 1;

// --- NAVIGASI ---
function hideAll() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('categoryPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    document.getElementById('playerPage').style.display = 'none';
    
    // Stop video saat pindah halaman
    const video = document.getElementById('mainVideo');
    video.pause();
    video.src = ""; 
}

function goHome() {
    hideAll();
    document.getElementById('homePage').style.display = 'block';
    
    // Reset active nav
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const firstBtn = document.querySelector('.category-nav button:first-child');
    if(firstBtn) firstBtn.classList.add('active');
}

function goBack() {
    hideAll();
    // Logika sederhana: Balik ke home. 
    // (Bisa dikembangkan jadi history.back() jika mau)
    document.getElementById('homePage').style.display = 'block';
}

// --- SETUP EVENT LISTENER (FIX SEARCH ENTER) ---
document.addEventListener("DOMContentLoaded", () => {
    // Tambahkan listener untuk tombol Enter di kolom pencarian
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Mencegah reload jika ada form
            handleSearch();
        }
    });

    initApp();
});

// --- 1. INISIALISASI ---
async function initApp() {
    await loadCategories(); 
    await loadHomeVIP();    
    await loadHomeLatest(); 
}

// Endpoint 8: Categories
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) {
            const nav = document.getElementById('categoryNav');
            // Hapus isi nav kecuali tombol 'Beranda'
            nav.innerHTML = '<button class="cat-btn active" onclick="goHome()">Beranda</button>';
            
            json.data.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-btn';
                btn.innerText = cat.name;
                btn.onclick = () => loadCategoryPage(cat.id, cat.name);
                nav.appendChild(btn);
            });
        }
    } catch (e) { console.error("Gagal load kategori", e); }
}

// Endpoint 3: VIP 
async function loadHomeVIP() {
    try {
        const res = await fetch('/api/vip');
        const json = await res.json();
        // Disini bisa dikembangkan untuk slider banner
    } catch (e) { console.error(e); }
}

// Endpoint 4: Home Latest
async function loadHomeLatest() {
    try {
        const res = await fetch(`/api/home?page=${currentHomeBookPage}&size=10`);
        const json = await res.json();
        if (json.success) {
            renderBooks(json.data.book, 'homeGrid');
            currentHomeBookPage++;
        }
    } catch (e) { console.error(e); }
}

function loadMoreHomeData() {
    loadHomeLatest();
}

// --- 2. FITUR KATEGORI ---
async function loadCategoryPage(id, name) {
    hideAll();
    document.getElementById('categoryPage').style.display = 'block';
    document.getElementById('catTitle').innerText = name;
    document.getElementById('catGrid').innerHTML = '<div class="loading">Memuat...</div>';
    
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));

    try {
        const res = await fetch(`/api/category/${id}?page=1&size=20`);
        const json = await res.json();
        document.getElementById('catGrid').innerHTML = ''; 
        if (json.success && json.data.bookList) {
            renderBooks(json.data.bookList, 'catGrid');
        }
    } catch (e) { console.error(e); }
}

// --- 3. FITUR SEARCH ---
async function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) return;

    hideAll();
    document.getElementById('searchPage').style.display = 'block';
    document.getElementById('searchKeyword').innerText = keyword;
    document.getElementById('searchGrid').innerHTML = '<div class="loading">Mencari...</div>';

    try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&page=1`);
        const json = await res.json();
        document.getElementById('searchGrid').innerHTML = '';
        
        if (json.success && json.data.book) {
            const normalizedBooks = json.data.book.map(b => ({
                bookId: b.id,
                bookName: b.name,
                cover: b.cover,
                corner: { name: b.tags ? b.tags[0] : 'Drama' } 
            }));
            renderBooks(normalizedBooks, 'searchGrid');
        } else {
            document.getElementById('searchGrid').innerHTML = '<p style="text-align:center; width:100%">Tidak ditemukan.</p>';
        }
    } catch (e) { 
        console.error(e); 
        document.getElementById('searchGrid').innerHTML = '<p>Terjadi kesalahan.</p>';
    }
}

// --- HELPER: RENDER KARTU ---
function renderBooks(list, containerId) {
    const container = document.getElementById(containerId);
    list.forEach(book => {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openPlayer(book.bookId || book.id);

        const imgUrl = book.coverWap || book.cover;
        let badgeHtml = '';
        if (book.corner && book.corner.name) {
            badgeHtml = `<div class="card-badge" style="background:${book.corner.color || '#ff2965'}">${book.corner.name}</div>`;
        }

        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${imgUrl}" loading="lazy" alt="${book.bookName}">
                ${badgeHtml}
            </div>
            <div class="card-info">
                <div class="card-title">${book.bookName || book.name}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 4. PLAYER (REVISI LOGIKA EPISODE) ---
async function openPlayer(bookId) {
    hideAll();
    document.getElementById('playerPage').style.display = 'block';
    
    // Reset UI
    document.getElementById('mainVideo').src = "";
    document.getElementById('mainVideo').poster = "";
    document.getElementById('detailTitle').innerText = "Memuat...";
    document.getElementById('episodeGrid').innerHTML = "<div class='loading'>Sedang mengambil link video...</div>";
    document.getElementById('castList').innerHTML = "";
    document.getElementById('recommendList').innerHTML = "";

    // A. Ambil Detail Info Drama
    try {
        const resDetail = await fetch(`/api/detail/${bookId}/v2`);
        const jsonDetail = await resDetail.json();
        
        if (jsonDetail.success) {
            const data = jsonDetail.data.drama;
            document.getElementById('detailTitle').innerText = data.bookName;
            document.getElementById('detailDesc').innerText = data.introduction;
            document.getElementById('detailView').innerHTML = `<i class="fas fa-eye"></i> ${data.viewCount}`;
            document.getElementById('detailEps').innerText = `${data.chapterCount} Episode`;
            document.getElementById('mainVideo').poster = data.cover;

            // Render Cast
            if (data.performerList) {
                const castContainer = document.getElementById('castList');
                data.performerList.forEach(p => {
                    castContainer.innerHTML += `
                        <div class="cast-item">
                            <img src="${p.performerAvatar}" class="cast-img">
                            <div class="cast-name">${p.performerName}</div>
                        </div>`;
                });
            }
        }
    } catch (e) { console.error("Detail Error", e); }

    // B. Ambil List Episode (REVISI: PRIORITAS ENDPOINT DOWNLOAD)
    let episodeList = [];
    
    try {
        console.log("Mencoba mengambil semua episode via Download API...");
        // Kita pakai endpoint 'Harta Karun' (Download) dulu karena isinya lengkap
        const resDl = await fetch(`/download/${bookId}`);
        const jsonDl = await resDl.json();

        if (jsonDl.status === 'success' && jsonDl.data && jsonDl.data.length > 0) {
            // Berhasil dapat data lengkap
            episodeList = jsonDl.data.map(ep => ({
                name: ep.chapterName,
                url: ep.videoPath,
                img: '' // Download API tidak bawa gambar thumbnail, gpp
            }));
            console.log(`Berhasil dapat ${episodeList.length} episode dari Download API`);
        } else {
            throw new Error("Download API kosong/gagal");
        }

    } catch (e) {
        console.warn("Gagal pakai Download API, mencoba fallback ke API Chapters...", e);
        
        // C. Fallback ke Endpoint Chapters (Biasanya cuma 6 episode awal)
        try {
            const resCh = await fetch(`/api/chapters/${bookId}`);
            const jsonCh = await resCh.json();
            
            if (jsonCh.success && jsonCh.data.length > 0) {
                episodeList = jsonCh.data.map(ep => {
                    let videoUrl = ep.videoPath;
                    // Coba cari kualitas 720p jika ada list CDN
                    if (ep.cdnList && ep.cdnList.length > 0) {
                        const bestCdn = ep.cdnList[0].videoPathList.find(v => v.quality === 720) || ep.cdnList[0].videoPathList[0];
                        videoUrl = bestCdn.videoPath;
                    }
                    return {
                        name: ep.chapterName || `EP ${ep.chapterIndex + 1}`,
                        url: videoUrl,
                        img: ep.chapterImg
                    };
                });
            }
        } catch (err2) {
            document.getElementById('episodeGrid').innerHTML = "<p>Gagal memuat episode.</p>";
            return;
        }
    }

    // D. Render Tombol Episode
    const epGrid = document.getElementById('episodeGrid');
    epGrid.innerHTML = "";
    
    if(episodeList.length === 0) {
        epGrid.innerHTML = "<p>Tidak ada episode tersedia.</p>";
        return;
    }

    episodeList.forEach((ep) => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        btn.innerText = ep.name;
        btn.onclick = () => {
            playEpisode(ep.url);
            document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        epGrid.appendChild(btn);
    });

    // Auto load episode 1 tapi jangan auto play (biar hemat kuota user pas baru buka)
    if (episodeList.length > 0) {
        document.getElementById('mainVideo').src = episodeList[0].url;
        // Tandai tombol episode 1 sebagai aktif
        epGrid.children[0].classList.add('active');
    }

    // E. Load Rekomendasi
    loadRecommendations();
}

function playEpisode(url) {
    const video = document.getElementById('mainVideo');
    video.src = url;
    video.play();
}

// Endpoint 10: Recommend
async function loadRecommendations() {
    try {
        const res = await fetch('/api/recommend');
        const json = await res.json();
        if (json.success) {
            renderBooks(json.data, 'recommendList'); 
        }
    } catch (e) { console.error(e); }
}

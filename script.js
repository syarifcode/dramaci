// Konfigurasi Proxy
const API_BASE = ""; // Kosong karena kita pakai relative path via vercel.json

// State Global
let currentHomeBookPage = 1;
let currentCategoryPage = 1;
let currentCategoryId = null;

// --- NAVIGASI ---
function hideAll() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('categoryPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    document.getElementById('playerPage').style.display = 'none';
    // Stop video
    document.getElementById('mainVideo').pause();
}

function goHome() {
    hideAll();
    document.getElementById('homePage').style.display = 'block';
    // Reset active nav
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.category-nav button:first-child').classList.add('active');
}

function goBack() {
    hideAll();
    // Default balik ke home, bisa dikembangkan buat history
    document.getElementById('homePage').style.display = 'block';
}

// --- 1. INISIALISASI (Endpoint 8: Kategori & Endpoint 3,4: Home) ---
async function initApp() {
    await loadCategories(); // Endpoint 8
    await loadHomeVIP();    // Endpoint 3
    await loadHomeLatest(); // Endpoint 4
}

// Endpoint 8: Categories
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) {
            const nav = document.getElementById('categoryNav');
            json.data.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-btn';
                btn.innerText = cat.name;
                btn.onclick = () => loadCategoryPage(cat.id, cat.name);
                nav.appendChild(btn);
            });
        }
    } catch (e) { console.error(e); }
}

// Endpoint 3: VIP (Untuk Banner)
async function loadHomeVIP() {
    try {
        const res = await fetch('/api/vip');
        const json = await res.json();
        // Implementasi sederhana: Ambil 'Pilihan Mingguan' sebagai highlight
        // (Bisa dikembangkan jadi slider)
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

// --- 2. FITUR KATEGORI (Endpoint 9) ---
async function loadCategoryPage(id, name) {
    hideAll();
    document.getElementById('categoryPage').style.display = 'block';
    document.getElementById('catTitle').innerText = name;
    document.getElementById('catGrid').innerHTML = '<div class="loading">Memuat...</div>';
    
    // Highlight Nav
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    // (Opsional: tambah logika highlight tombol yg diklik)

    try {
        const res = await fetch(`/api/category/${id}?page=1&size=20`);
        const json = await res.json();
        document.getElementById('catGrid').innerHTML = ''; // Clear loading
        if (json.success && json.data.bookList) {
            renderBooks(json.data.bookList, 'catGrid');
        }
    } catch (e) { console.error(e); }
}

// --- 3. FITUR SEARCH (Endpoint 1) ---
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
            // Mapping data search (strukturnya sedikit beda, id ada di 'id' bukan 'bookId')
            // Kita normalisasi agar fungsi renderBooks bisa dipakai
            const normalizedBooks = json.data.book.map(b => ({
                bookId: b.id,
                bookName: b.name,
                cover: b.cover,
                corner: { name: b.tags ? b.tags[0] : 'Drama' } // Ambil tag pertama sbg badge
            }));
            renderBooks(normalizedBooks, 'searchGrid');
        } else {
            document.getElementById('searchGrid').innerHTML = '<p>Tidak ditemukan.</p>';
        }
    } catch (e) { console.error(e); }
}

// --- HELPER: RENDER KARTU ---
function renderBooks(list, containerId) {
    const container = document.getElementById(containerId);
    list.forEach(book => {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openPlayer(book.bookId || book.id);

        // Handle gambar (kadang cover, kadang coverWap)
        const imgUrl = book.coverWap || book.cover;
        // Handle badge (corner)
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

// --- 4. PLAYER & DETAIL (Endpoint 5, 6, 2, 7, 10) ---
async function openPlayer(bookId) {
    hideAll();
    document.getElementById('playerPage').style.display = 'block';
    
    // Reset UI
    document.getElementById('mainVideo').src = "";
    document.getElementById('mainVideo').poster = "";
    document.getElementById('detailTitle').innerText = "Memuat...";
    document.getElementById('episodeGrid').innerHTML = "Mengambil data episode...";
    document.getElementById('castList').innerHTML = "";
    document.getElementById('recommendList').innerHTML = "";

    // A. Ambil Detail (Endpoint 5)
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

    // B. Ambil Video List (Priority: Endpoint 6 -> Fallback: Endpoint 2)
    let episodeList = [];
    try {
        // Coba Endpoint 6 dulu (Kualitas Tinggi & Multi Resolusi)
        const resCh = await fetch(`/api/chapters/${bookId}`);
        const jsonCh = await resCh.json();
        
        if (jsonCh.success && jsonCh.data.length > 0) {
            // Data dari endpoint 6
            episodeList = jsonCh.data.map(ep => {
                // Cari video 720p atau yang default
                let videoUrl = "";
                if (ep.cdnList && ep.cdnList.length > 0) {
                    const bestCdn = ep.cdnList[0].videoPathList.find(v => v.quality === 720) || ep.cdnList[0].videoPathList[0];
                    videoUrl = bestCdn.videoPath;
                } else {
                    videoUrl = ep.videoPath;
                }
                
                return {
                    name: ep.chapterName || `EP ${ep.chapterIndex + 1}`,
                    url: videoUrl,
                    img: ep.chapterImg
                };
            });
        } else {
            throw new Error("Endpoint 6 kosong");
        }
    } catch (e) {
        console.log("Endpoint 6 gagal, coba fallback ke Endpoint 2 (Download All)...");
        try {
            const resDl = await fetch(`/download/${bookId}`);
            const jsonDl = await resDl.json();
            if (jsonDl.status === 'success') {
                episodeList = jsonDl.data.map(ep => ({
                    name: ep.chapterName,
                    url: ep.videoPath
                }));
            }
        } catch (err2) { console.error("Gagal load episode", err2); }
    }

    // C. Render Tombol Episode
    const epGrid = document.getElementById('episodeGrid');
    epGrid.innerHTML = "";
    
    episodeList.forEach((ep, idx) => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        btn.innerText = ep.name;
        btn.onclick = () => {
            playEpisode(ep.url);
            // Highlight active
            document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        epGrid.appendChild(btn);
    });

    // Auto play episode 1
    if (episodeList.length > 0) {
        // Jangan auto-play video suara biar gak kaget, tapi load src nya
        document.getElementById('mainVideo').src = episodeList[0].url;
        epGrid.children[0].classList.add('active');
    }

    // D. Load Rekomendasi (Endpoint 10)
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
            renderBooks(json.data, 'recommendList'); // Reuse fungsi renderBooks
        }
    } catch (e) { console.error(e); }
}

// Start App
initApp();

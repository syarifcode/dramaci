// Konfigurasi Proxy
const API_BASE = ""; 

// State Global
let currentHomeBookPage = 1;
// KITA TAMBAHKAN INI: Daftar ID yang sudah muncul di Home biar tidak kembar
let homeLoadedIds = new Set(); 

// --- SISTEM RIWAYAT (HISTORY API) AGAR TOMBOL BACK HP JALAN ---
window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state && state.page) {
        if (state.page === 'home') goHome(false); 
        else if (state.page === 'category') restoreCategory(state);
        else if (state.page === 'search') restoreSearch(state);
        else if (state.page === 'player') restorePlayer(state);
    } else {
        goHome(false);
    }
});

function navigateTo(pageName, stateData = {}) {
    history.pushState({ page: pageName, ...stateData }, "", `#${pageName}`);
}

// --- TOGGLE MENU ---
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// --- NAVIGASI UI ---
function hideAll() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('categoryPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    document.getElementById('playerPage').style.display = 'none';
    
    const video = document.getElementById('mainVideo');
    video.pause();
    video.src = ""; 
    window.scrollTo(0, 0);
}

function goHome(pushHistory = true) {
    hideAll();
    document.getElementById('homePage').style.display = 'block';
    
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const firstBtn = document.querySelector('.category-nav button:first-child');
    if(firstBtn) firstBtn.classList.add('active');

    if (pushHistory) {
        history.pushState({ page: 'home' }, "", "./");
    }
}

function goBack() {
    history.back(); 
}

// --- INIT & EVENT LISTENER ---
document.addEventListener("DOMContentLoaded", () => {
    history.replaceState({ page: 'home' }, "", "./");

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
            searchInput.blur();
        }
    });

    initApp();
});

async function initApp() {
    await loadCategories(); 
    await loadHomeVIP();    
    await loadHomeLatest(); 
}

// --- KATEGORI ---
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) {
            const nav = document.getElementById('categoryNav');
            nav.innerHTML = '<button class="cat-btn active" onclick="goHome()">🔥 Beranda</button>';
            
            json.data.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-btn';
                btn.innerText = cat.name;
                btn.onclick = () => loadCategoryPage(cat.id, cat.name);
                nav.appendChild(btn);
            });
        }
    } catch (e) { console.error("Kategori error", e); }
}

async function loadHomeVIP() {
    // Placeholder banner
}

// --- LOGIKA HOME (FIX DUPLIKAT & LOAD MORE) ---
async function loadHomeLatest() {
    const container = document.getElementById('homeGrid');
    
    // Hapus spinner bawah jika ada
    const oldSpinner = container.querySelector('.loading-spinner-item');
    if(oldSpinner) oldSpinner.remove();

    try {
        const res = await fetch(`/api/home?page=${currentHomeBookPage}&size=12`);
        const json = await res.json();
        
        if (json.success) {
            // Jika halaman 1, RESET semua (termasuk daftar ID yang sudah dimuat)
            if (currentHomeBookPage === 1) {
                container.innerHTML = ''; 
                homeLoadedIds.clear(); // Bersihkan memori anti-duplikat
            }

            // --- FILTER ANTI DUPLIKAT ---
            // Hanya ambil buku yang ID-nya BELUM ada di homeLoadedIds
            const uniqueBooks = [];
            if (json.data.book) {
                json.data.book.forEach(book => {
                    // Cek ID (karena API kadang pakai 'id' kadang 'bookId')
                    const realId = book.id || book.bookId;
                    
                    if (!homeLoadedIds.has(realId)) {
                        homeLoadedIds.add(realId); // Simpan ID ke memori
                        uniqueBooks.push(book);    // Masukkan ke daftar antrian render
                    }
                });
            }
            // ---------------------------

            renderBooks(uniqueBooks, 'homeGrid');
            currentHomeBookPage++;
            
            const loadMoreBtn = document.getElementById('loadMoreHome');
            if(loadMoreBtn) {
                if(!json.data.isMore) loadMoreBtn.style.display = 'none';
                else loadMoreBtn.style.display = 'block';
            }
        }
    } catch (e) { console.error(e); }
}

function loadMoreHomeData() {
    const container = document.getElementById('homeGrid');
    const spinnerDiv = document.createElement('div');
    spinnerDiv.className = 'loading-spinner loading-spinner-item';
    spinnerDiv.style.gridColumn = "1 / -1"; 
    container.appendChild(spinnerDiv);

    loadHomeLatest();
}

// --- HALAMAN KATEGORI ---
async function loadCategoryPage(id, name) {
    navigateTo('category', { id, name });
    renderCategoryView(id, name);
}

function restoreCategory(state) {
    renderCategoryView(state.id, state.name);
}

async function renderCategoryView(id, name) {
    hideAll();
    document.getElementById('categoryPage').style.display = 'block';
    document.getElementById('catTitle').innerText = name;
    document.getElementById('catGrid').innerHTML = '<div class="loading-spinner"></div>';
    
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active');
        if(b.innerText === name) b.classList.add('active');
    });

    try {
        const res = await fetch(`/api/category/${id}?page=1&size=21`);
        const json = await res.json();
        document.getElementById('catGrid').innerHTML = ''; 
        if (json.success && json.data.bookList) {
            renderBooks(json.data.bookList, 'catGrid');
        }
    } catch (e) { console.error(e); }
}

// --- SEARCH ---
async function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) return;

    navigateTo('search', { keyword });
    renderSearchView(keyword);
}

function restoreSearch(state) {
    document.getElementById('searchInput').value = state.keyword;
    renderSearchView(state.keyword);
}

async function renderSearchView(keyword) {
    hideAll();
    document.getElementById('searchPage').style.display = 'block';
    document.getElementById('searchKeyword').innerText = keyword;
    document.getElementById('searchGrid').innerHTML = '<div class="loading-spinner"></div>';

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
            document.getElementById('searchGrid').innerHTML = '<p style="text-align:center; width:100%; color:#aaa; margin-top:20px;">Tidak ditemukan.</p>';
        }
    } catch (e) { 
        document.getElementById('searchGrid').innerHTML = '<p>Terjadi kesalahan.</p>';
    }
}

// --- HELPER RENDER ---
function renderBooks(list, containerId) {
    const container = document.getElementById(containerId);
    list.forEach(book => {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openPlayer(book.bookId || book.id);

        const imgUrl = book.coverWap || book.cover;
        let badgeHtml = '';
        if (book.corner && book.corner.name) {
            badgeHtml = `<div class="card-badge">${book.corner.name}</div>`;
        }

        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${imgUrl}" loading="lazy" alt="${book.bookName}">
                <div class="card-overlay">
                    <div class="card-title">${book.bookName || book.name}</div>
                </div>
                ${badgeHtml}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- PLAYER SYSTEM ---
async function openPlayer(bookId) {
    navigateTo('player', { bookId });
    renderPlayerView(bookId);
}

function restorePlayer(state) {
    renderPlayerView(state.bookId);
}

async function renderPlayerView(bookId) {
    hideAll();
    document.getElementById('playerPage').style.display = 'block';
    
    document.getElementById('mainVideo').src = "";
    document.getElementById('mainVideo').poster = "";
    document.getElementById('detailTitle').innerText = "Memuat...";
    document.getElementById('episodeGrid').innerHTML = "<div class='loading-spinner'></div>";
    document.getElementById('castList').innerHTML = "";
    document.getElementById('recommendList').innerHTML = "";

    try {
        const resDetail = await fetch(`/api/detail/${bookId}/v2`);
        const jsonDetail = await resDetail.json();
        
        if (jsonDetail.success) {
            const data = jsonDetail.data.drama;
            document.getElementById('detailTitle').innerText = data.bookName;
            document.getElementById('detailDesc').innerText = data.introduction;
            document.getElementById('detailView').innerHTML = `<i class="fas fa-eye"></i> ${(data.viewCount / 1000000).toFixed(1)}M Views`;
            document.getElementById('detailEps').innerText = `${data.chapterCount} Episode`;
            document.getElementById('mainVideo').poster = data.cover;

            if (data.performerList) {
                const castContainer = document.getElementById('castList');
                data.performerList.forEach(p => {
                    castContainer.innerHTML += `
                        <div class="cast-item">
                            <img src="${p.performerAvatar}" class="cast-img">
                            <div class="cast-name">${p.performerName.split(' ')[0]}</div>
                        </div>`;
                });
            }
        }
    } catch (e) { console.error("Detail Error", e); }

    let episodeList = [];
    try {
        const resDl = await fetch(`/download/${bookId}`);
        const jsonDl = await resDl.json();

        if (jsonDl.status === 'success' && jsonDl.data && jsonDl.data.length > 0) {
            episodeList = jsonDl.data.map(ep => ({
                name: ep.chapterName,
                url: ep.videoPath
            }));
        } else {
            throw new Error("Gagal Download API");
        }
    } catch (e) {
        try {
            const resCh = await fetch(`/api/chapters/${bookId}`);
            const jsonCh = await resCh.json();
            if (jsonCh.success) {
                episodeList = jsonCh.data.map(ep => ({
                    name: `EP ${ep.chapterIndex+1}`,
                    url: ep.videoPath
                }));
            }
        } catch(err2){}
    }

    const epGrid = document.getElementById('episodeGrid');
    epGrid.innerHTML = "";
    
    if(episodeList.length === 0) {
        epGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #555;'>Episode tidak tersedia.</p>";
        return;
    }

    episodeList.forEach((ep) => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn';
        btn.innerText = ep.name.replace('Episode ', ''); 
        btn.onclick = () => {
            playEpisode(ep.url);
            document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        epGrid.appendChild(btn);
    });

    if (episodeList.length > 0) {
        document.getElementById('mainVideo').src = episodeList[0].url;
        epGrid.children[0].classList.add('active');
    }

    loadRecommendations();
}

function playEpisode(url) {
    const video = document.getElementById('mainVideo');
    video.src = url;
    video.play();
    window.scrollTo(0, 0); 
}

async function loadRecommendations() {
    try {
        const res = await fetch('/api/recommend');
        const json = await res.json();
        if (json.success) {
            renderBooks(json.data, 'recommendList'); 
        }
    } catch (e) {}
}

// --- KONFIGURASI ---
const API_BASE = ""; 
let currentHomeBookPage = 1;
let homeLoadedIds = new Set(); 

// --- HISTORY API ---
window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state && state.page) {
        if (state.page === 'home') goHome(false); 
        else if (state.page === 'vip') openVIPPage(false); 
        else if (state.page === 'category') restoreCategory(state);
        else if (state.page === 'search') restoreSearch(state);
        else if (state.page === 'player') restorePlayer(state);
    } else { goHome(false); }
});

function navigateTo(pageName, stateData = {}) {
    history.pushState({ page: pageName, ...stateData }, "", `#${pageName}`);
}

// --- NAVIGASI UI ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function hideAll() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('categoryPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    document.getElementById('playerPage').style.display = 'none';
    document.getElementById('mainVideo').pause();
    document.getElementById('mainVideo').src = ""; 
    window.scrollTo(0, 0);
}

// --- FUNGSI HOME ---
function goHome(pushHistory = true) {
    hideAll();
    document.getElementById('homePage').style.display = 'block';
    
    // Tampilkan Trending, Sembunyikan VIP
    document.getElementById('trendingSection').style.display = 'block';
    document.getElementById('vipContainer').style.display = 'none';

    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const firstBtn = document.querySelector('.category-nav button:first-child');
    if(firstBtn) firstBtn.classList.add('active');

    if (pushHistory) history.pushState({ page: 'home' }, "", "./");
}

// --- FUNGSI VIP ---
function openVIPPage(pushHistory = true) {
    hideAll();
    document.getElementById('homePage').style.display = 'block';

    // Tampilkan VIP, Sembunyikan Trending
    document.getElementById('trendingSection').style.display = 'none';
    document.getElementById('vipContainer').style.display = 'block';

    // Highlight tombol VIP
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));

    if (pushHistory) history.pushState({ page: 'vip' }, "", "#vip");
    window.scrollTo(0, 0);
}

function goBack() { history.back(); }

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    history.replaceState({ page: 'home' }, "", "./");
    document.getElementById('searchInput').addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
            document.getElementById('searchInput').blur();
        }
    });
    initApp();
});

async function initApp() {
    await loadCategories(); 
    await loadHomeVIP();    
    await loadHomeLatest(); 
}

// --- LOAD VIP DATA ---
async function loadHomeVIP() {
    const container = document.getElementById('vipContainer');
    container.innerHTML = '<div class="loading-spinner"></div>'; 

    try {
        const res = await fetch('/api/vip');
        const json = await res.json();
        container.innerHTML = ''; 

        let columns = [];
        if (json.data && json.data.data && json.data.data.columnVoList) {
            columns = json.data.data.columnVoList;
        } else if (json.data && json.data.columnVoList) {
            columns = json.data.columnVoList;
        }

        if (columns.length > 0) {
            columns.forEach(col => {
                if (!col.bookList || col.bookList.length === 0) return;

                const section = document.createElement('section');
                section.className = 'content-section';
                section.innerHTML = `
                    <div class="section-header">
                        <h2>${col.title}</h2>
                        <span style="font-size:0.7rem; background: linear-gradient(45deg, #FFD700, #FFA500); color:black; padding:2px 8px; border-radius:4px; font-weight:bold; margin-left:8px; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);">VIP</span>
                    </div>
                    <div class="grid-container" id="vip-col-${col.columnId}"></div>
                `;
                container.appendChild(section);
                renderBooks(col.bookList, `vip-col-${col.columnId}`);
            });
        }
    } catch (e) { 
        container.innerHTML = '<p style="text-align:center">Gagal memuat VIP.</p>'; 
    }
}

// --- LOAD CATEGORY ---
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        const list = json.data || []; 
        if (list.length > 0) {
            const nav = document.getElementById('categoryNav');
            list.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-btn';
                btn.innerText = cat.name;
                btn.onclick = () => loadCategoryPage(cat.id, cat.name);
                nav.appendChild(btn);
            });
        }
    } catch (e) {}
}

// --- LOAD LATEST ---
async function loadHomeLatest() {
    const container = document.getElementById('homeGrid');
    const oldSpinner = container.querySelector('.loading-spinner-item');
    if(oldSpinner) oldSpinner.remove();

    try {
        const res = await fetch(`/api/home?page=${currentHomeBookPage}&size=12`);
        const json = await res.json();
        const bookList = (json.data && json.data.book) ? json.data.book : [];
        const isMore = (json.data && json.data.isMore) ? json.data.isMore : false;
        
        if (bookList.length > 0) {
            if (currentHomeBookPage === 1) {
                container.innerHTML = ''; 
                homeLoadedIds.clear(); 
            }
            const uniqueBooks = [];
            bookList.forEach(book => {
                const realId = book.id || book.bookId;
                if (!homeLoadedIds.has(realId)) {
                    homeLoadedIds.add(realId);
                    uniqueBooks.push(book);
                }
            });
            renderBooks(uniqueBooks, 'homeGrid');
            currentHomeBookPage++;
            
            const loadMoreBtn = document.getElementById('loadMoreHome');
            if(loadMoreBtn) {
                if(!isMore) loadMoreBtn.style.display = 'none';
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

// --- FUNGSI LAINNYA ---
async function loadCategoryPage(id, name) {
    navigateTo('category', { id, name });
    renderCategoryView(id, name);
}
function restoreCategory(state) { renderCategoryView(state.id, state.name); }
async function renderCategoryView(id, name) {
    hideAll();
    document.getElementById('categoryPage').style.display = 'block';
    document.getElementById('catTitle').innerText = name;
    document.getElementById('catGrid').innerHTML = '<div class="loading-spinner"></div>';
    try {
        const res = await fetch(`/api/category/${id}?page=1&size=21`);
        const json = await res.json();
        document.getElementById('catGrid').innerHTML = ''; 
        const bookList = (json.data && json.data.bookList) ? json.data.bookList : [];
        if (bookList.length > 0) renderBooks(bookList, 'catGrid');
        else document.getElementById('catGrid').innerHTML = '<p style="text-align:center">Kosong</p>';
    } catch (e) {}
}

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
        const bookList = (json.data && json.data.book) ? json.data.book : [];
        if (bookList.length > 0) {
            const normalizedBooks = bookList.map(b => ({
                bookId: b.id, bookName: b.name, cover: b.cover, corner: { name: b.tags ? b.tags[0] : '' } 
            }));
            renderBooks(normalizedBooks, 'searchGrid');
        } else document.getElementById('searchGrid').innerHTML = '<p>Tidak ditemukan.</p>';
    } catch (e) {}
}

// --- RENDER BOOKS (MODIFIKASI BADGE) ---
function renderBooks(list, containerId) {
    const container = document.getElementById(containerId);
    
    // Cek apakah ini bagian Rekomendasi
    const isRecommendationSection = (containerId === 'recommendList');

    list.forEach(book => {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openPlayer(book.bookId || book.id);

        const imgUrl = book.coverWap || book.cover;
        let badgeHtml = '';

        // JANGAN TAMPILKAN BADGE DI REKOMENDASI
        if (!isRecommendationSection) {
            if (book.corner && book.corner.name) {
                let label = book.corner.name;
                // Ubah text "Anggota Saja" jadi "Gratis"
                if (label === "Anggota Saja") label = "Gratis"; 
                
                // Gunakan class premium-style
                badgeHtml = `<div class="card-badge premium-style">${label}</div>`;
            } else if (book.tags && book.tags.length > 0 && typeof book.tags[0] === 'string') {
                 // Fallback badge biasa
                 badgeHtml = `<div class="card-badge">${book.tags[0]}</div>`;
            }
        }

        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${imgUrl}" loading="lazy">
                <div class="card-overlay"><div class="card-title">${book.bookName || book.name}</div></div>
                ${badgeHtml}
            </div>`;
        container.appendChild(div);
    });
}

// --- PLAYER ---
async function openPlayer(bookId) {
    navigateTo('player', { bookId });
    renderPlayerView(bookId);
}
function restorePlayer(state) { renderPlayerView(state.bookId); }
async function renderPlayerView(bookId) {
    hideAll();
    document.getElementById('playerPage').style.display = 'block';
    document.getElementById('mainVideo').src = "";
    document.getElementById('detailTitle').innerText = "Memuat...";
    document.getElementById('episodeGrid').innerHTML = "<div class='loading-spinner'></div>";
    
    try {
        const res = await fetch(`/api/detail/${bookId}/v2`);
        const json = await res.json();
        if(json.success) {
            const d = json.data.drama;
            document.getElementById('detailTitle').innerText = d.bookName;
            document.getElementById('detailDesc').innerText = d.introduction;
            document.getElementById('detailEps').innerText = `${d.chapterCount} Eps`;
            document.getElementById('mainVideo').poster = d.cover;
            const castContainer = document.getElementById('castList');
            castContainer.innerHTML = '';
            if(d.performerList) {
                d.performerList.forEach(p => {
                    castContainer.innerHTML += `<div class="cast-item"><img src="${p.performerAvatar}" class="cast-img"><div class="cast-name">${p.performerName.split(' ')[0]}</div></div>`;
                });
            }
        }
    } catch(e){}

    let episodeList = [];
    try {
        const resDl = await fetch(`/download/${bookId}`);
        const jsonDl = await resDl.json();
        if (jsonDl.status === 'success') {
            episodeList = jsonDl.data.map(ep => ({ name: ep.chapterName, url: ep.videoPath }));
        } else throw new Error();
    } catch (e) {
        try {
            const resCh = await fetch(`/api/chapters/${bookId}`);
            const jsonCh = await resCh.json();
            if (jsonCh.success) episodeList = jsonCh.data.map(ep => ({ name: `EP ${ep.chapterIndex+1}`, url: ep.videoPath }));
        } catch(err2){}
    }

    const epGrid = document.getElementById('episodeGrid');
    epGrid.innerHTML = "";
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

function scrollToEpisodes() {
    document.getElementById('episodeSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function playEpisode(url) {
    const v = document.getElementById('mainVideo');
    v.src = url; v.play(); window.scrollTo(0, 0); 
}
async function loadRecommendations() {
    try {
        const res = await fetch('/api/recommend');
        const json = await res.json();
        if (json.success) renderBooks(json.data, 'recommendList'); 
    } catch (e) {}
}

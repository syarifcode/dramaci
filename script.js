// --- KONFIGURASI ---
let currentHomeBookPage = 1;
let homeLoadedIds = new Set(); 
const HISTORY_KEY = 'dramaci_history_v7'; // Kunci penyimpanan baru

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    // Default tab: Home
    switchTab('home', false);
    
    // Enter search
    document.getElementById('searchInput').addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
            document.getElementById('searchInput').blur();
        }
    });

    initApp();
});

// --- SISTEM NAVIGASI (SWITCH TAB) ---
function switchTab(tabName, pushHistory = true) {
    // 1. Sembunyikan semua halaman utama
    const pages = ['homePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage', 'playerPage'];
    pages.forEach(p => document.getElementById(p).style.display = 'none');

    // 2. Matikan video jika pindah tab
    const video = document.getElementById('mainVideo');
    video.pause(); video.src = "";

    // 3. Reset Active Style di Bottom Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // 4. Logika Per Tab
    if (tabName === 'home') {
        document.getElementById('homePage').style.display = 'block';
        document.getElementById('nav-home').classList.add('active');
    } 
    else if (tabName === 'dubbed') {
        document.getElementById('dubbedPage').style.display = 'block';
        document.getElementById('nav-dubbed').classList.add('active');
        loadDubbedData(); // Muat data dubbing
    } 
    else if (tabName === 'vip') {
        document.getElementById('vipPage').style.display = 'block';
        document.getElementById('nav-vip').classList.add('active');
        loadVipData(); // Muat data VIP
    } 
    else if (tabName === 'history') {
        document.getElementById('historyPage').style.display = 'block';
        document.getElementById('nav-history').classList.add('active');
        loadHistoryData(); // Muat data history dari LocalStorage
    }

    if(pushHistory) history.pushState({ page: tabName }, "", `#${tabName}`);
    window.scrollTo(0, 0);
}

// Handle Back Button Browser
window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state && state.page) switchTab(state.page, false);
    else switchTab('home', false);
});

function goBack() { history.back(); }

// --- DATA LOADERS ---

async function initApp() {
    await loadHomeLatest(); 
}

// 1. HOME (TRENDING)
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

// 2. DUBBING (Bhs Indo)
let dubbedLoaded = false;
async function loadDubbedData() {
    if(dubbedLoaded) return; // Jangan load kalau sudah ada
    const container = document.getElementById('dubbedGrid');
    
    try {
        const res = await fetch('/api/dubbed');
        const json = await res.json();
        
        container.innerHTML = ''; // Hapus spinner
        
        // Parsing data dubbing
        let list = [];
        if(json.data && json.data.data && json.data.data.classifyBookList && json.data.data.classifyBookList.records) {
            list = json.data.data.classifyBookList.records;
        }

        if(list.length > 0) {
            renderBooks(list, 'dubbedGrid');
            dubbedLoaded = true;
        } else {
            container.innerHTML = '<p style="text-align:center;width:100%">Data kosong.</p>';
        }

    } catch(e) {
        container.innerHTML = '<p style="text-align:center;width:100%">Gagal memuat.</p>';
    }
}

// 3. VIP (Pindah ke Tab)
let vipLoaded = false;
async function loadVipData() {
    if(vipLoaded) return;
    const container = document.getElementById('vipGrid');
    
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
                
                // Buat Judul Section
                const title = document.createElement('h3');
                title.innerText = col.title;
                title.style.margin = "20px 0 10px 0";
                title.style.borderLeft = "4px solid #FFD700";
                title.style.paddingLeft = "10px";
                title.style.gridColumn = "1 / -1";
                container.appendChild(title);

                // Render per section
                // Kita butuh wrapper sementara atau langsung renderBooks
                // Tapi renderBooks butuh ID container.
                // Solusi: Bikin div wrapper
                const wrapperId = `vip-sec-${col.columnId}`;
                const wrapper = document.createElement('div');
                wrapper.id = wrapperId;
                wrapper.className = 'grid-container'; // Pakai grid class yg sama
                wrapper.style.gridColumn = "1 / -1";
                wrapper.style.marginBottom = "20px";
                container.appendChild(wrapper);

                renderBooks(col.bookList, wrapperId);
            });
            vipLoaded = true;
        }
    } catch(e) {
        container.innerHTML = '<p style="text-align:center">Gagal memuat VIP.</p>'; 
    }
}

// 4. HISTORY (LocalStorage)
function loadHistoryData() {
    const container = document.getElementById('historyGrid');
    container.innerHTML = '';

    const historyRaw = localStorage.getItem(HISTORY_KEY);
    const historyList = historyRaw ? JSON.parse(historyRaw) : [];

    if(historyList.length > 0) {
        renderBooks(historyList, 'historyGrid');
    } else {
        container.innerHTML = '<p style="text-align:center;width:100%;color:#777;padding:20px;">Belum ada riwayat tontonan.</p>';
    }
}

function clearHistory() {
    if(confirm("Hapus semua riwayat tontonan?")) {
        localStorage.removeItem(HISTORY_KEY);
        loadHistoryData();
    }
}

function saveToHistory(bookData) {
    let historyList = [];
    const raw = localStorage.getItem(HISTORY_KEY);
    if(raw) historyList = JSON.parse(raw);

    // Hapus jika sudah ada (biar naik ke paling atas/baru)
    const existsIndex = historyList.findIndex(b => b.bookId == bookData.bookId);
    if(existsIndex > -1) {
        historyList.splice(existsIndex, 1);
    }

    // Tambah ke awal array
    historyList.unshift(bookData);

    // Limit simpanan cuma 50 drama biar gak berat
    if(historyList.length > 50) historyList.pop();

    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
}


// --- SEARCH ---
async function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) return;
    
    // Tampilkan Overlay Search (bukan switch tab bawah)
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
    } catch (e) {
        document.getElementById('searchGrid').innerHTML = '<p>Error.</p>';
    }
}

// --- RENDER BOOKS ---
function renderBooks(list, containerId) {
    const container = document.getElementById(containerId);
    // Cek apakah ini bagian Rekomendasi
    const isRecommendationSection = (containerId === 'recommendList');

    list.forEach(book => {
        const div = document.createElement('div');
        div.className = 'card';
        // Pastikan ID ada
        const bId = book.bookId || book.id;
        div.onclick = () => openPlayer(bId);

        const imgUrl = book.coverWap || book.cover;
        let badgeHtml = '';

        if (!isRecommendationSection) {
            if (book.corner && book.corner.name) {
                let label = book.corner.name;
                if (label === "Anggota Saja") label = "Gratis"; 
                badgeHtml = `<div class="card-badge premium-style">${label}</div>`;
            } else if (book.tags && book.tags.length > 0 && typeof book.tags[0] === 'string') {
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
    // Tampilkan Overlay Player
    document.getElementById('playerPage').style.display = 'block';
    
    const v = document.getElementById('mainVideo');
    v.src = ""; 
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
            
            // --- SAVE TO HISTORY ---
            saveToHistory({
                bookId: bookId,
                bookName: d.bookName,
                cover: d.cover,
                corner: { name: "Ditonton" }
            });
            // ---------------------

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
            const vid = document.getElementById('mainVideo');
            vid.src = ep.url; vid.play(); window.scrollTo(0, 0); 
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
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}
async function loadRecommendations() {
    try {
        const res = await fetch('/api/recommend');
        const json = await res.json();
        if (json.success) renderBooks(json.data, 'recommendList'); 
    } catch (e) {}
}

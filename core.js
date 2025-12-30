const Core = {
    // --- STATE ---
    pageDB: 1,
    pageExplore: 1,
    pageDubbed: 1,
    exploreLoading: false,
    
    // KEYS LOCALSTORAGE
    historyKey: 'dramaci_v9_history',
    savedKey: 'dramaci_v9_saved', // Key baru buat simpanan
    
    // UI STATE
    activeHistoryTab: 'history', // 'history' atau 'saved'
    
    // PLAYER STATE
    currentEpisodeIndex: 0,
    currentEpisodeList: [],
    autoNextTimer: null,
    activeFetchId: 0,
    currentSource: null,
    currentDramaTitle: "", 
    currentDramaDetails: null, // Data lengkap drama yg sedang dibuka (buat disimpan)

    // PWA STATE
    deferredPrompt: null,

    // --- INIT ---
    init: () => {
        // 1. Service Worker Registration (PWA)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
            .then(() => console.log('SW Registered'))
            .catch(err => console.log('SW Fail', err));
        }

        // 2. Install App Logic
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            Core.deferredPrompt = e;
            const btnContainer = document.getElementById('installContainer');
            if(btnContainer) btnContainer.style.display = 'block';
        });

        const btnInstall = document.getElementById('btnInstallApp');
        if(btnInstall) {
            btnInstall.addEventListener('click', () => {
                if (Core.deferredPrompt) {
                    Core.deferredPrompt.prompt();
                    Core.deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            document.getElementById('installContainer').style.display = 'none';
                        }
                        Core.deferredPrompt = null;
                    });
                }
            });
        }

        // Event Listeners
        document.getElementById('searchInput').addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                Core.handleSearch();
                document.getElementById('searchInput').blur();
            }
        });

        window.addEventListener('scroll', () => {
            if (document.getElementById('explorePage').style.display !== 'none') {
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                    Core.loadExplore();
                }
            }
        });

        const video = document.getElementById('mainVideo');
        video.addEventListener('ended', () => {
            Core.startAutoNext();
        });

        Core.loadHome();
        
        // Load default history tab
        Core.loadHistory(); 
        
        window.onpopstate = (e) => {
            if(e.state && e.state.page) switchTab(e.state.page, false);
            else switchTab('home', false);
        };
    },

    // --- HOME LOGIC ---
    loadHome: async () => {
        const dbData = await Dramabox.fetchHome(1, 50);
        Core.renderCards(dbData, 'homeGridDB');
        Core.pageDB++;

        const nsData = await Netshort.fetchTheaters();
        if (nsData.viral && nsData.viral.length > 0) {
            Core.renderCards(nsData.viral, 'homeListNS', true);
        } else {
            document.getElementById('homeNetshortSection').style.display = 'none';
        }
    },

    loadMoreHomeDB: async () => {
        const data = await Dramabox.fetchHome(Core.pageDB, 50);
        if (data.length > 0) {
            Core.renderCards(data, 'homeGridDB');
            Core.pageDB++;
        } else {
            alert("Sudah habis!");
        }
    },

    // --- EXPLORE & DUBBING ---
    loadExplore: async () => {
        if (Core.exploreLoading) return;
        Core.exploreLoading = true;
        const container = document.getElementById('exploreGrid');
        if(Core.pageExplore > 1) {
            const spinner = document.createElement('div'); spinner.className = 'loading-spinner-item'; container.appendChild(spinner);
        }
        const data = await Netshort.fetchExplore(Core.pageExplore);
        const spinners = container.querySelectorAll('.loading-spinner-item'); spinners.forEach(s => s.remove());
        const mainSpinner = container.querySelector('.loading-spinner'); if(mainSpinner) mainSpinner.remove();
        if (data.length > 0) { Core.renderCards(data, 'exploreGrid'); Core.pageExplore++; }
        Core.exploreLoading = false;
    },

    loadDubbed: async () => {
        const container = document.getElementById('dubbedGrid');
        if(container.children.length > 1) return;
        const dbData = await Dramabox.fetchDubbed(1, 50);
        const nsAll = await Netshort.fetchTheaters();
        const nsData = nsAll.dubbing || [];
        const combined = [...nsData, ...dbData];
        Core.renderCards(combined, 'dubbedGrid');
        Core.pageDubbed++;
    },
    
    loadMoreDubbed: async () => {
        const data = await Dramabox.fetchDubbed(Core.pageDubbed, 50);
        if (data.length > 0) { Core.renderCards(data, 'dubbedGrid'); Core.pageDubbed++; }
    },

    loadVIP: async () => {
        const container = document.getElementById('vipGrid');
        if(container.children.length > 1) return;
        const sections = await Dramabox.fetchVIP();
        container.innerHTML = '';
        sections.forEach(sec => {
            if(sec.list.length === 0) return;
            const title = document.createElement('h3'); title.innerText = sec.title;
            title.style.gridColumn = "1 / -1"; title.style.margin = "20px 0 10px 0";
            title.style.borderLeft = "4px solid #E91E63"; title.style.paddingLeft = "10px";
            container.appendChild(title);
            const wrapperId = `vip-${Math.random().toString(36).substr(2, 9)}`;
            const wrapper = document.createElement('div'); wrapper.id = wrapperId;
            wrapper.className = 'grid-container'; wrapper.style.gridColumn = "1 / -1";
            container.appendChild(wrapper);
            Core.renderCards(sec.list, wrapperId);
        });
    },

    // --- SEARCH ---
    openSearchPage: () => {
        switchTab('searchPage', true);
        document.getElementById('searchKeyword').innerText = "Jelajahi";
        document.getElementById('searchGrid').innerHTML = ''; 
        document.getElementById('searchInput').value = ''; 
        const catSection = document.getElementById('searchCategories');
        if(catSection) catSection.style.display = 'block';
        const genres = ["💖 Romantis", "💼 CEO", "😢 Sad Ending", "🤬 Balas Dendam", "🤰 Hamil & Lari", "✨ Fantasi", "🤣 Komedi", "👑 Kerajaan", "🌶️ Dewasa 21+", "🎬 Action"];
        const genreList = document.getElementById('genreList');
        if(genreList) {
            genreList.innerHTML = '';
            genres.forEach(g => {
                const chip = document.createElement('div'); chip.className = 'tag-chip'; chip.innerText = g;
                chip.onclick = () => {
                    const keyword = g.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                    document.getElementById('searchInput').value = keyword; Core.handleSearch();
                };
                genreList.appendChild(chip);
            });
        }
        setTimeout(() => { document.getElementById('searchInput').removeAttribute('readonly'); }, 500);
    },

    handleSearch: async () => {
        const keyword = document.getElementById('searchInput').value;
        if (!keyword) return;
        const catSection = document.getElementById('searchCategories');
        if(catSection) catSection.style.display = 'none';
        const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'playerPage'];
        pages.forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('searchPage').style.display = 'block';
        document.getElementById('searchKeyword').innerText = keyword;
        document.getElementById('searchGrid').innerHTML = '<div class="loading-spinner"></div>';
        const [dbResults, nsResults] = await Promise.all([ Dramabox.search(keyword), Netshort.search(keyword) ]);
        const container = document.getElementById('searchGrid'); container.innerHTML = '';
        const combined = [...nsResults, ...dbResults]; 
        if (combined.length > 0) Core.renderCards(combined, 'searchGrid');
        else container.innerHTML = '<p style="text-align:center;width:100%">Tidak ditemukan.</p>';
    },

    renderCards: (list, containerId, isHorizontal = false) => {
        const container = document.getElementById(containerId); if(!container) return;
        const spinner = container.querySelector('.loading-spinner'); if(spinner && !container.querySelector('.card')) spinner.remove();
        list.forEach(item => {
            const div = document.createElement('div'); div.className = 'card';
            div.onclick = () => Core.openPlayer(item.source, item.id);
            let badgeHtml = '';
            if (item.label) {
                let labelText = item.label === 'Anggota Saja' ? 'Gratis' : item.label;
                badgeHtml = `<div class="card-badge">${labelText}</div>`;
            }
            let viewHtml = item.score ? `<div style="position:absolute; bottom:35px; left:8px; font-size:0.7rem; color:#ddd; text-shadow:1px 1px 2px black;"><i class="fas fa-eye"></i> ${item.score}</div>` : '';
            div.innerHTML = `<div class="card-img-wrapper"><img src="${item.cover}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'"><div class="card-overlay"><div class="card-title">${item.title}</div></div>${badgeHtml}${viewHtml}</div>`;
            container.appendChild(div);
        });
    },

    // --- PLAYER LOGIC ---
    openPlayer: async (source, id) => {
        const thisRequestId = Date.now();
        Core.activeFetchId = thisRequestId;
        Core.currentSource = source;

        const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage'];
        pages.forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('playerPage').style.display = 'block';
        window.scrollTo(0, 0);
        history.pushState({ page: 'player' }, "", "#player");

        const video = document.getElementById('mainVideo');
        video.src = ""; video.poster = ""; video.removeAttribute('crossorigin');
        video.querySelectorAll('track').forEach(t => t.remove()); 
        
        document.getElementById('detailTitle').innerText = "Memuat...";
        document.getElementById('detailDesc').innerText = "";
        document.getElementById('episodeGrid').innerHTML = '<div class="loading-spinner"></div>';
        document.getElementById('recList').innerHTML = '<div class="loading-spinner"></div>'; 
        document.getElementById('autoNextOverlay').style.display = 'none';
        document.getElementById('btnNextEp').disabled = true;

        Core.currentEpisodeList = [];
        Core.currentEpisodeIndex = 0;
        Core.currentDramaDetails = null; // Reset details

        let details = null;
        if (source === 'db') details = await Dramabox.fetchDetail(id);
        else if (source === 'ns') details = await Netshort.fetchDetail(id);

        if (Core.activeFetchId !== thisRequestId) return;
        if (!details) { alert("Gagal memuat detail drama."); return; }

        // Simpan data lengkap untuk fitur Save/History
        Core.currentEpisodeList = details.episodes;
        Core.currentEpisodeIndex = 0;
        Core.currentDramaTitle = details.title;
        Core.currentDramaDetails = {
            source: source,
            id: id,
            title: details.title,
            cover: details.cover,
            label: 'Disimpan'
        };

        // Render UI Detail
        document.getElementById('detailTitle').innerText = details.title;
        document.getElementById('detailDesc').innerText = details.intro;
        document.getElementById('detailEps').innerText = `${details.totalEps} Eps`;
        video.poster = details.cover;
        document.getElementById('detailSource').innerText = source === 'db' ? 'Dramabox' : 'Netshort';

        // Update Tombol Save (Cek status)
        Core.checkSaveStatus(id);

        // Masuk ke History otomatis
        Core.saveToHistory({ 
            source: source, id: id, title: details.title, cover: details.cover, label: 'Terakhir' 
        });

        // Render Episode Buttons
        const epGrid = document.getElementById('episodeGrid');
        epGrid.innerHTML = '';
        details.episodes.forEach((ep, index) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn';
            btn.innerText = ep.name.replace('Episode ', '').replace('EP ', '');
            btn.onclick = () => { Core.playSpecificEpisode(index); };
            epGrid.appendChild(btn);
        });

        if (details.episodes.length > 0) Core.playSpecificEpisode(0);

        // Load Rekomendasi
        Core.loadRecommendations();
    },

    playSpecificEpisode: (index) => {
        const video = document.getElementById('mainVideo');
        const overlay = document.getElementById('autoNextOverlay');
        overlay.style.display = 'none';
        if(Core.autoNextTimer) clearInterval(Core.autoNextTimer);

        Core.currentEpisodeIndex = index;
        const ep = Core.currentEpisodeList[index];
        if(!ep) return;

        if (Core.currentSource === 'ns') video.setAttribute('crossorigin', 'anonymous');
        else video.removeAttribute('crossorigin');

        video.src = ep.url;
        
        video.querySelectorAll('track').forEach(t => t.remove());
        if (ep.subtitles && ep.subtitles.length > 0) {
            const sub = ep.subtitles.find(s => s.lang === 'id_ID') || ep.subtitles[0];
            if (sub && sub.url) {
                const track = document.createElement('track');
                track.kind = 'subtitles'; track.label = 'Indonesia'; track.srclang = 'id';
                track.src = sub.url; track.default = true;
                video.appendChild(track);
            }
        }

        video.play().catch(e => console.log("Auto-play blocked"));
        window.scrollTo(0, 0);

        document.querySelectorAll('.ep-btn').forEach((b, i) => {
            if(i === index) b.classList.add('active');
            else b.classList.remove('active');
        });

        const nextBtn = document.getElementById('btnNextEp');
        if (index < Core.currentEpisodeList.length - 1) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `Next (${index + 2}) <i class="fas fa-forward"></i>`;
        } else {
            nextBtn.disabled = true;
            nextBtn.innerHTML = `Tamat <i class="fas fa-check"></i>`;
        }
    },

    // --- FITUR SHARE & REKOMENDASI ---
    shareDrama: () => {
        const text = `Nonton *${Core.currentDramaTitle}* seru banget! Gratis di Dramaci. Cek sini: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },

    loadRecommendations: async () => {
        const nsData = await Netshort.fetchTheaters();
        const allList = [...(nsData.viral || []), ...(nsData.dubbing || [])];
        const shuffled = allList.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 6);
        Core.renderCards(selected, 'recList');
    },

    // --- FITUR SIMPAN / FAVORIT (LOGIC BARU) ---
    toggleSave: () => {
        if (!Core.currentDramaDetails) return;
        
        let savedList = JSON.parse(localStorage.getItem(Core.savedKey) || '[]');
        const existingIndex = savedList.findIndex(item => item.id === Core.currentDramaDetails.id);
        
        const btn = document.getElementById('btnSaveDrama');
        const icon = btn.querySelector('i');

        if (existingIndex === -1) {
            // BELUM DISIMPAN -> SIMPAN
            savedList.unshift(Core.currentDramaDetails);
            alert("Disimpan ke Pustaka ❤️");
            
            // Update UI Button
            btn.classList.add('active');
            icon.classList.remove('far'); // Hapus outline
            icon.classList.add('fas');    // Pakai solid
        } else {
            // SUDAH DISIMPAN -> HAPUS
            savedList.splice(existingIndex, 1);
            alert("Dihapus dari Pustaka 💔");
            
            // Update UI Button
            btn.classList.remove('active');
            icon.classList.remove('fas'); // Hapus solid
            icon.classList.add('far');    // Pakai outline
        }
        
        localStorage.setItem(Core.savedKey, JSON.stringify(savedList));
    },

    checkSaveStatus: (id) => {
        const savedList = JSON.parse(localStorage.getItem(Core.savedKey) || '[]');
        const isSaved = savedList.some(item => item.id == id); // Pakai == biar aman string/int
        
        const btn = document.getElementById('btnSaveDrama');
        const icon = btn.querySelector('i');
        
        if (isSaved) {
            btn.classList.add('active');
            icon.className = 'fas fa-heart'; // Merah Solid
        } else {
            btn.classList.remove('active');
            icon.className = 'far fa-heart'; // Outline Putih
        }
    },

    // --- HISTORY & PUSTAKA LOGIC (UPDATED) ---
    saveToHistory: (item) => {
        let history = JSON.parse(localStorage.getItem(Core.historyKey) || '[]');
        history = history.filter(h => h.id !== item.id);
        history.unshift(item);
        if (history.length > 50) history.pop();
        localStorage.setItem(Core.historyKey, JSON.stringify(history));
    },

    // Logic Switcher Tab (Riwayat vs Disimpan)
    switchHistoryTab: (tabName) => {
        Core.activeHistoryTab = tabName;
        
        // Update UI Tabs
        document.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active'));
        if(tabName === 'history') document.getElementById('tab-history').classList.add('active');
        else document.getElementById('tab-saved').classList.add('active');

        // Reload Grid
        Core.loadHistory();
    },

    loadHistory: () => {
        const container = document.getElementById('historyGrid');
        container.innerHTML = '';

        let data = [];
        let emptyMsg = "";

        if (Core.activeHistoryTab === 'history') {
            data = JSON.parse(localStorage.getItem(Core.historyKey) || '[]');
            emptyMsg = "Belum ada riwayat tontonan.";
        } else {
            data = JSON.parse(localStorage.getItem(Core.savedKey) || '[]');
            emptyMsg = "Belum ada drama yang disimpan.";
        }

        if (data.length > 0) {
            Core.renderCards(data, 'historyGrid');
        } else {
            container.innerHTML = `<p style="text-align:center;width:100%;color:#666;margin-top:20px;">${emptyMsg}</p>`;
        }
    },

    clearHistory: () => {
        if (Core.activeHistoryTab === 'history') {
            if(confirm("Hapus semua riwayat tontonan?")) { 
                localStorage.removeItem(Core.historyKey); 
                Core.loadHistory(); 
            }
        } else {
            if(confirm("Hapus semua drama yang disimpan?")) { 
                localStorage.removeItem(Core.savedKey); 
                Core.loadHistory(); 
            }
        }
    },

    // --- AUTO NEXT & HELPERS ---
    startAutoNext: () => {
        if (Core.currentEpisodeIndex >= Core.currentEpisodeList.length - 1) return;
        const overlay = document.getElementById('autoNextOverlay');
        const timerEl = document.getElementById('countdownTimer');
        let timeLeft = 5;
        overlay.style.display = 'flex';
        timerEl.innerText = timeLeft;
        Core.autoNextTimer = setInterval(() => {
            timeLeft--; timerEl.innerText = timeLeft;
            if (timeLeft <= 0) { clearInterval(Core.autoNextTimer); Core.playNextEpisode(); }
        }, 1000);
    },

    cancelAutoNext: () => {
        document.getElementById('autoNextOverlay').style.display = 'none';
        if(Core.autoNextTimer) clearInterval(Core.autoNextTimer);
    },

    playNextEpisode: () => {
        if (Core.currentEpisodeIndex < Core.currentEpisodeList.length - 1) {
            Core.playSpecificEpisode(Core.currentEpisodeIndex + 1);
        }
    },

    scrollToEpisodes: () => { document.getElementById('episodeSection').scrollIntoView({ behavior: 'smooth' }); },
    goBack: () => { history.back(); }
};

function switchTab(tabName, pushHistory = true) {
    const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage', 'playerPage'];
    pages.forEach(p => document.getElementById(p).style.display = 'none');
    const video = document.getElementById('mainVideo');
    video.pause(); video.src = "";
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    if (tabName === 'home') { document.getElementById('homePage').style.display = 'block'; document.getElementById('nav-home').classList.add('active'); }
    else if (tabName === 'explore') { document.getElementById('explorePage').style.display = 'block'; document.getElementById('nav-explore').classList.add('active'); if(document.getElementById('exploreGrid').children.length <= 1) Core.loadExplore(); }
    else if (tabName === 'dubbed') { document.getElementById('dubbedPage').style.display = 'block'; document.getElementById('nav-dubbed').classList.add('active'); Core.loadDubbed(); }
    else if (tabName === 'vip') { document.getElementById('vipPage').style.display = 'block'; document.getElementById('nav-vip').classList.add('active'); Core.loadVIP(); }
    else if (tabName === 'history') { 
        document.getElementById('historyPage').style.display = 'block'; 
        document.getElementById('nav-history').classList.add('active'); 
        Core.loadHistory(); 
    }

    if(pushHistory) history.pushState({ page: tabName }, "", `#${tabName}`);
    window.scrollTo(0, 0);
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", Core.init);

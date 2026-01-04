const Core = {
    // --- STATE ---
    pageDB: 1, pageExplore: 1, pageDubbed: 1, exploreLoading: false,
    historyKey: 'icisa_history', savedKey: 'icisa_saved',
    activeHistoryTab: 'history', currentEpisodeIndex: 0, currentEpisodeList: [],
    autoNextTimer: null, activeFetchId: 0, currentSource: null, currentDramaTitle: "", currentDramaDetails: null, deferredPrompt: null,
    mixedPageCounter: 1, 
    currentSliderData: [], 

    init: () => {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); Core.deferredPrompt = e; const btn = document.getElementById('installContainer'); if(btn) btn.style.display = 'block'; });
        const btnInstall = document.getElementById('btnInstallApp');
        if(btnInstall) btnInstall.addEventListener('click', () => { if (Core.deferredPrompt) { Core.deferredPrompt.prompt(); Core.deferredPrompt.userChoice.then((res) => { if (res.outcome === 'accepted') document.getElementById('installContainer').style.display = 'none'; Core.deferredPrompt = null; }); } });

        document.getElementById('searchInput').addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); Core.handleSearch(); document.getElementById('searchInput').blur(); } });
        
        // FIX INFINITY SCROLL EXPLORE
        window.addEventListener('scroll', () => { 
            if (document.getElementById('explorePage').style.display !== 'none') { 
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                    Core.loadExplore(); 
                }
            } 
        });
        
        document.getElementById('mainVideo').addEventListener('ended', () => Core.startAutoNext());
        
        window.onpopstate = (e) => { 
            Core.stopPlayer(); 
            if(e.state && e.state.page) switchTab(e.state.page, false); 
            else switchTab('home', false); 
        };

        Core.loadHome();
        Core.loadHistory();
    },

    // --- HOME LOGIC ---
    loadHome: async () => {
        try {
            const dbData = await DramaboxV2.fetchTrending();
            if (dbData && dbData.length > 0) {
                Core.currentSliderData = dbData.slice(0, 5); 
                Core.renderSlider(Core.currentSliderData); 
                Core.renderCards(dbData, 'homeGridDB'); 
            }
        } catch (e) { console.error("DB Load Error", e); }

        Melolo.fetchHome().then(mData => {
            const mCombined = [...(mData.trending||[]), ...(mData.latest||[])];
            if (mCombined.length > 0) {
                Core.renderCards(Core.removeDuplicates(mCombined), 'homeListMelolo', true);
                const meloloTop = mCombined.slice(0, 2);
                const mixed = [...meloloTop, ...(Core.currentSliderData || [])].slice(0, 7);
                Core.currentSliderData = mixed;
                Core.renderSlider(mixed);
            } else {
                document.getElementById('homeMeloloSection').style.display = 'none';
            }
        }).catch(() => {
            document.getElementById('homeMeloloSection').style.display = 'none';
        });

        DramaboxV2.fetchLatest(1).then(data => {
            if(data.length > 0) Core.renderCards(data, 'homeListLatest', true);
            else document.getElementById('homeLatestSection').style.display = 'none';
        }).catch(() => document.getElementById('homeLatestSection').style.display = 'none');

        Netshort.fetchTheaters().then(data => {
            if (data && data.viral && data.viral.length > 0) Core.renderCards(data.viral, 'homeListNS', true);
            else document.getElementById('homeNetshortSection').style.display = 'none';
        }).catch(console.error);
    },

    // --- VIP LOGIC (FIX RESET) ---
    loadVIP: async () => { 
        const container = document.getElementById('vipGrid'); 
        if(container.children.length > 1) return; // Cache
        
        container.innerHTML='<div class="loading-spinner"></div>'; 
        
        try {
            const sections = await DramaboxV2.fetchVIP();
            container.innerHTML = ''; // Reset loading
            
            if (sections && sections.length > 0) {
                sections.forEach(sec => { 
                    if(!sec.list || sec.list.length===0) return; 
                    const t=document.createElement('h3'); t.innerText=sec.title; 
                    t.style.gridColumn="1/-1"; t.style.margin="20px 0 10px 0"; t.style.borderLeft="4px solid #E91E63"; t.style.paddingLeft="10px"; container.appendChild(t); 
                    const w=document.createElement('div'); w.className='grid-container'; w.style.gridColumn="1/-1"; 
                    sec.list.forEach(item => w.appendChild(Core.createCardElement(item)));
                    container.appendChild(w); 
                });
            } else {
                container.innerHTML = '<p style="text-align:center;width:100%;margin-top:20px;">Data VIP Kosong.</p>';
            }
        } catch(e) { 
            console.error(e);
            container.innerHTML = '<p style="text-align:center;width:100%;margin-top:20px;">Gagal memuat VIP.</p>'; 
        }
    },

    // --- DUBBING INDO ---
    loadDubbed: async () => {
        const container = document.getElementById('dubbedGrid');
        if(container.children.length > 1) return;
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const results = await Promise.allSettled([
                DramaboxV2.fetchDubbed(1),
                DramaboxV2.fetchDubbed(2),
                Netshort.fetchTheaters()
            ]);

            let combined = [];
            if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) combined = [...combined, ...results[0].value];
            if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) combined = [...combined, ...results[1].value];
            if (results[2].status === 'fulfilled' && results[2].value && results[2].value.dubbing) combined = [...combined, ...results[2].value.dubbing];

            container.innerHTML = '';
            if (combined.length > 0) { 
                Core.renderCards(Core.removeDuplicates(combined), 'dubbedGrid'); 
                Core.pageDubbed = 3; 
            } else { 
                container.innerHTML = '<p>Belum ada data.</p>';
            }
        } catch (e) {
            container.innerHTML = '<p>Gagal memuat data.</p>';
        }
    },

    loadMoreDubbed: async () => {
        const btn = event.target; btn.innerText = "Memuat...";
        try {
            const data = await DramaboxV2.fetchDubbed(Core.pageDubbed);
            if (data && data.length > 0) { Core.renderCards(data, 'dubbedGrid'); Core.pageDubbed++; btn.innerText = "Muat Lebih Banyak"; } 
            else { btn.style.display = 'none'; alert("Sudah habis!"); }
        } catch(e){ btn.innerText = "Coba Lagi"; }
    },

    // --- EXPLORE LOGIC (NETSHORT ONLY) ---
    loadExplore: async () => {
        if(Core.exploreLoading) return;
        Core.exploreLoading = true;
        
        const container = document.getElementById('exploreGrid');
        const spinner = document.createElement('div'); spinner.className = 'loading-spinner';
        container.appendChild(spinner);
        
        try {
            const data = await Netshort.fetchTheaters();
            spinner.remove();
            if (data && data.viral && data.viral.length > 0) {
                const shuffled = data.viral.sort(() => 0.5 - Math.random());
                Core.renderCards(shuffled, 'exploreGrid');
            } 
        } catch(e) { if(spinner) spinner.remove(); }
        Core.exploreLoading = false;
    },

    // --- LOAD MORE HOME ---
    loadMoreHomeDB: async () => {
        const btn = document.getElementById('btnLoadMoreDB');
        const originalText = "Muat Lebih Banyak";
        btn.innerText = "Memuat..."; btn.disabled = true;
        try {
            Core.mixedPageCounter++;
            let data = [];
            try { data = await DramaboxV2.fetchLatest(Core.mixedPageCounter); } catch(e) {}
            const container = document.getElementById('homeGridDB');
            const existingIds = Array.from(container.querySelectorAll('.card')).map(c => c.dataset.id);
            let uniqueData = (data || []).filter(item => !existingIds.includes(item.id.toString()));
            if (uniqueData.length < 2) {
                try {
                    const dubData = await DramaboxV2.fetchDubbed(Core.mixedPageCounter);
                    const uniqueDub = (dubData || []).filter(item => !existingIds.includes(item.id.toString()));
                    uniqueData = [...uniqueData, ...uniqueDub];
                } catch(e) {}
            }
            if (uniqueData.length > 0) {
                uniqueData.sort(() => Math.random() - 0.5);
                Core.renderCards(uniqueData, 'homeGridDB');
                btn.innerText = originalText; btn.disabled = false;
            } else {
                btn.innerText = "Coba Lagi"; btn.disabled = false;
                Core.mixedPageCounter += 2;
            }
        } catch(e) { btn.innerText = "Coba Lagi"; btn.disabled = false; }
    },

    // --- PLAYER & UTILS ---
    stopPlayer: () => {
        const video = document.getElementById('mainVideo');
        if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
        if (Core.autoNextTimer) clearInterval(Core.autoNextTimer);
        document.getElementById('autoNextOverlay').style.display = 'none';
        Core.currentEpisodeIndex = 0; Core.currentEpisodeList = [];
    },

    openPlayer: async (source, id) => {
        Core.stopPlayer();
        Core.activeFetchId = Date.now(); const thisReq = Core.activeFetchId; Core.currentSource = source;
        ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage', 'sectionPage'].forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('playerPage').style.display = 'block'; window.scrollTo(0, 0); history.pushState({ page: 'player' }, "", "#player");
        
        const video = document.getElementById('mainVideo'); 
        document.getElementById('detailTitle').innerText = "Memuat..."; 
        document.getElementById('episodeGrid').innerHTML = '<div class="loading-spinner"></div>';
        
        let details = null;
        try { 
            if(source==='db') details = await DramaboxV2.fetchDetail(id); 
            else if(source==='ns') details = await Netshort.fetchDetail(id); 
            else if(source==='melolo') details = await Melolo.fetchDetail(id); 
        } catch(e){}
        
        if (Core.activeFetchId !== thisReq || document.getElementById('playerPage').style.display === 'none') return;
        if (!details) { alert("Gagal memuat detail."); Core.goBack(); return; }

        Core.currentEpisodeList = details.episodes; Core.currentEpisodeIndex = 0; Core.currentDramaTitle = details.title;
        Core.currentDramaDetails = { source: source, id: id, title: details.title, cover: details.cover, label: 'Disimpan' };

        document.getElementById('detailTitle').innerText = details.title; document.getElementById('detailDesc').innerText = details.intro || "-"; 
        document.getElementById('detailEps').innerText = `${details.totalEps || details.episodes.length} Eps`;
        video.poster = details.cover; document.getElementById('detailSource').innerText = source === 'db' ? 'Icisa VIP' : (source === 'ns' ? 'Netshort' : 'Melolo');
        Core.checkSaveStatus(id); Core.saveToHistory(Core.currentDramaDetails);

        const epGrid = document.getElementById('episodeGrid'); epGrid.innerHTML = '';
        if(details.episodes.length === 0) epGrid.innerHTML = '<p>Episode belum tersedia.</p>';
        else { details.episodes.forEach((ep, index) => { const btn = document.createElement('button'); btn.className = 'ep-btn'; const isLocked = ep.isLocked && !ep.url; btn.innerHTML = `${ep.name.replace(/^(Episode|EP)\s?/i, '')} ${isLocked ? '🔒' : ''}`; if(isLocked) btn.style.opacity = '0.5'; btn.onclick = () => Core.playSpecificEpisode(index); epGrid.appendChild(btn); }); Core.playSpecificEpisode(0); }
        if(details.recommendations && details.recommendations.length > 0) Core.renderCards(details.recommendations, 'recList'); else Core.loadRecommendations();
    },

    playSpecificEpisode: async (index) => {
        const video = document.getElementById('mainVideo'); document.getElementById('autoNextOverlay').style.display = 'none'; if(Core.autoNextTimer) clearInterval(Core.autoNextTimer);
        Core.currentEpisodeIndex = index; const ep = Core.currentEpisodeList[index]; if(!ep) return;
        document.querySelectorAll('.ep-btn').forEach((b, i) => { if(i === index) b.classList.add('active'); else b.classList.remove('active'); });
        let streamUrl = ep.url;
        if (Core.currentSource === 'melolo' && !streamUrl) { try { const fetchUrl = await Melolo.fetchStream(ep.vid); if(fetchUrl) streamUrl = fetchUrl; } catch(e) {} }
        if (!streamUrl) { alert("Video tidak dapat diputar."); return; }
        video.src = streamUrl; video.play().catch(console.log); window.scrollTo(0, 0);
        const nextBtn = document.getElementById('btnNextEp'); if (index < Core.currentEpisodeList.length - 1) { nextBtn.disabled = false; nextBtn.innerHTML = `Next (${index + 2}) <i class="fas fa-forward"></i>`; } else { nextBtn.disabled = true; nextBtn.innerHTML = `Tamat <i class="fas fa-check"></i>`; }
    },

    // --- UTILS ---
    renderSlider: (list) => { 
        const container = document.getElementById('heroSlider'); if(!container) return; 
        container.innerHTML = ''; 
        if(container.querySelector('.loading-spinner')) container.innerHTML = '';
        list.forEach(item => { 
            const slide = document.createElement('div'); slide.className = 'hero-slide'; 
            const imgSrc = item.poster || item.cover; 
            slide.innerHTML = `<img src="${imgSrc}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/600x300?text=No+Image'"><div class="hero-overlay"><div class="hero-info"><span class="hero-badge">Trending</span><h1>${item.title}</h1><p>${item.score}</p><button onclick="Core.openPlayer('${item.source}', '${item.id}')"><i class="fas fa-play"></i> Tonton</button></div></div>`; 
            container.appendChild(slide); 
        }); 
    },
    
    createCardElement: (item) => {
        const div = document.createElement('div'); div.className = 'card'; div.dataset.id = item.id;
        div.onclick = () => Core.openPlayer(item.source, item.id);
        let badgeHtml = item.source === 'melolo' ? `<div class="card-badge" style="background: linear-gradient(45deg, #FF9800, #F44336);">Melolo</div>` : (item.label ? `<div class="card-badge">${item.label}</div>` : '');
        let viewHtml = item.score ? `<div style="position:absolute; bottom:35px; left:8px; font-size:0.7rem; color:#ddd; text-shadow:1px 1px 2px black;"><i class="fas fa-eye"></i> ${item.score}</div>` : '';
        div.innerHTML = `<div class="card-img-wrapper"><img src="${item.cover}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'"><div class="card-overlay"><div class="card-title">${item.title}</div></div>${badgeHtml}${viewHtml}</div>`;
        return div;
    },
    renderCards: (list, containerId, isHorizontal = false) => { const container = document.getElementById(containerId); if(!container) return; const spinner = container.querySelector('.loading-spinner'); if(spinner) spinner.remove(); list.forEach(item => { container.appendChild(Core.createCardElement(item)); }); },
    shareDrama: () => { window.open(`https://wa.me/?text=${encodeURIComponent('Nonton '+Core.currentDramaTitle+' di Icisa!')}`, '_blank'); },
    loadRecommendations: async () => { try { const nsData = await Netshort.fetchTheaters(); const allList = (nsData.viral || []).sort(() => 0.5 - Math.random()); Core.renderCards(allList.slice(0, 6), 'recList'); } catch(e){} },
    toggleSave: () => { if (!Core.currentDramaDetails) return; let savedList = JSON.parse(localStorage.getItem(Core.savedKey) || '[]'); const existingIndex = savedList.findIndex(item => item.id == Core.currentDramaDetails.id); const btn = document.getElementById('btnSaveDrama'); const icon = btn.querySelector('i'); if (existingIndex === -1) { savedList.unshift(Core.currentDramaDetails); alert("Disimpan ❤️"); btn.classList.add('active'); icon.className = 'fas fa-heart'; } else { savedList.splice(existingIndex, 1); alert("Dihapus 💔"); btn.classList.remove('active'); icon.className = 'far fa-heart'; } localStorage.setItem(Core.savedKey, JSON.stringify(savedList)); },
    checkSaveStatus: (id) => { const savedList = JSON.parse(localStorage.getItem(Core.savedKey) || '[]'); const isSaved = savedList.some(item => item.id == id); const btn = document.getElementById('btnSaveDrama'); const icon = btn.querySelector('i'); if (isSaved) { btn.classList.add('active'); icon.className = 'fas fa-heart'; } else { btn.classList.remove('active'); icon.className = 'far fa-heart'; } },
    saveToHistory: (item) => { let history = JSON.parse(localStorage.getItem(Core.historyKey) || '[]'); history = history.filter(h => h.id != item.id); history.unshift(item); if (history.length > 50) history.pop(); localStorage.setItem(Core.historyKey, JSON.stringify(history)); },
    switchHistoryTab: (tabName) => { Core.activeHistoryTab = tabName; document.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active')); if(tabName === 'history') document.getElementById('tab-history').classList.add('active'); else document.getElementById('tab-saved').classList.add('active'); Core.loadHistory(); },
    loadHistory: () => { const container = document.getElementById('historyGrid'); container.innerHTML = ''; let data = []; if (Core.activeHistoryTab === 'history') data = JSON.parse(localStorage.getItem(Core.historyKey) || '[]'); else data = JSON.parse(localStorage.getItem(Core.savedKey) || '[]'); if (data.length > 0) Core.renderCards(data, 'historyGrid'); else container.innerHTML = '<p style="text-align:center;width:100%;color:#666;margin-top:20px;">Belum ada data.</p>'; },
    clearHistory: () => { const key = Core.activeHistoryTab === 'history' ? Core.historyKey : Core.savedKey; if(confirm("Hapus semua?")) { localStorage.removeItem(key); Core.loadHistory(); } },
    startAutoNext: () => { if (Core.currentEpisodeIndex >= Core.currentEpisodeList.length - 1) return; document.getElementById('autoNextOverlay').style.display = 'flex'; let timeLeft = 5; document.getElementById('countdownTimer').innerText = timeLeft; Core.autoNextTimer = setInterval(() => { timeLeft--; document.getElementById('countdownTimer').innerText = timeLeft; if (timeLeft <= 0) { clearInterval(Core.autoNextTimer); Core.playNextEpisode(); } }, 1000); },
    cancelAutoNext: () => { document.getElementById('autoNextOverlay').style.display = 'none'; clearInterval(Core.autoNextTimer); },
    playNextEpisode: () => { if (Core.currentEpisodeIndex < Core.currentEpisodeList.length - 1) Core.playSpecificEpisode(Core.currentEpisodeIndex + 1); },
    scrollToEpisodes: () => { document.getElementById('episodeSection').scrollIntoView({ behavior: 'smooth' }); },
    goBack: () => { Core.stopPlayer(); history.back(); },
    openSearchPage: () => { switchTab('searchPage', true); document.getElementById('searchKeyword').innerText = "Jelajahi"; document.getElementById('searchGrid').innerHTML = ''; document.getElementById('searchInput').value = ''; const catSection = document.getElementById('searchCategories'); if(catSection) catSection.style.display = 'block'; const genres = ["💖 Romantis", "💼 CEO", "😢 Sad Ending", "🤬 Balas Dendam", "🤰 Hamil & Lari", "✨ Fantasi", "🤣 Komedi", "👑 Kerajaan", "🎬 Action"]; const genreList = document.getElementById('genreList'); if(genreList) { genreList.innerHTML = ''; genres.forEach(g => { const chip = document.createElement('div'); chip.className = 'tag-chip'; chip.innerText = g; chip.onclick = () => { const k = g.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim(); document.getElementById('searchInput').value = k; Core.handleSearch(); }; genreList.appendChild(chip); }); } setTimeout(() => document.getElementById('searchInput').removeAttribute('readonly'), 500); },
    removeDuplicates: (arr) => { const unique = []; const seen = new Set(); for (const item of arr) { if (!seen.has(item.id)) { seen.add(item.id); unique.push(item); } } return unique; }
};

function switchTab(t, p=true) {
    Core.stopPlayer();
    const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage', 'playerPage', 'sectionPage'];
    pages.forEach(el => { const elem = document.getElementById(el); if(elem) elem.style.display = 'none'; });
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (t === 'home') { document.getElementById('homePage').style.display = 'block'; document.getElementById('nav-home').classList.add('active'); }
    else if (t === 'explore') { document.getElementById('explorePage').style.display = 'block'; document.getElementById('nav-explore').classList.add('active'); if(document.getElementById('exploreGrid').children.length <= 1) Core.loadExplore(); }
    else if (t === 'dubbed') { document.getElementById('dubbedPage').style.display = 'block'; document.getElementById('nav-dubbed').classList.add('active'); Core.loadDubbed(); }
    else if (t === 'vip') { document.getElementById('vipPage').style.display = 'block'; document.getElementById('nav-vip').classList.add('active'); Core.loadVIP(); }
    else if (t === 'history') { document.getElementById('historyPage').style.display = 'block'; document.getElementById('nav-history').classList.add('active'); Core.loadHistory(); }
    else if (t === 'sectionPage') { document.getElementById('sectionPage').style.display = 'block'; }
    else if (t === 'searchPage') { document.getElementById('searchPage').style.display = 'block'; }
    if (p) history.pushState({ page: t }, "", `#${t}`);
    window.scrollTo(0, 0);
}

function toggleMenu(){document.getElementById('sidebar').classList.toggle('active');document.querySelector('.sidebar-overlay').classList.toggle('active');}
document.addEventListener("DOMContentLoaded", Core.init);
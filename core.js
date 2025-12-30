const Core = {
    // --- STATE & INIT (SAMA SEPERTI SEBELUMNYA) ---
    pageDB: 1, pageExplore: 1, pageDubbed: 1, exploreLoading: false,
    historyKey: 'dramaci_v10_history', savedKey: 'dramaci_v10_saved',
    activeHistoryTab: 'history', currentEpisodeIndex: 0, currentEpisodeList: [],
    autoNextTimer: null, activeFetchId: 0, currentSource: null, currentDramaTitle: "", currentDramaDetails: null, deferredPrompt: null,

    init: () => {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); Core.deferredPrompt = e; const btn = document.getElementById('installContainer'); if(btn) btn.style.display = 'block'; });
        const btnInstall = document.getElementById('btnInstallApp');
        if(btnInstall) btnInstall.addEventListener('click', () => { if (Core.deferredPrompt) { Core.deferredPrompt.prompt(); Core.deferredPrompt.userChoice.then((res) => { if (res.outcome === 'accepted') document.getElementById('installContainer').style.display = 'none'; Core.deferredPrompt = null; }); } });

        document.getElementById('searchInput').addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); Core.handleSearch(); document.getElementById('searchInput').blur(); } });
        window.addEventListener('scroll', () => { if (document.getElementById('explorePage').style.display !== 'none') { if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) Core.loadExplore(); } });
        document.getElementById('mainVideo').addEventListener('ended', () => Core.startAutoNext());
        window.onpopstate = (e) => { if(e.state && e.state.page) switchTab(e.state.page, false); else switchTab('home', false); };

        Core.loadHome();
        Core.loadHistory();
    },

    // --- HOME LOGIC (ANTI-BAPER) ---
    loadHome: () => {
        // Dramabox
        Dramabox.fetchHome(1, 50).then(dbData => {
            Core.renderCards(dbData, 'homeGridDB');
            Core.pageDB++;
        }).catch(console.error);

        // Netshort (Wajib Muncul)
        Netshort.fetchTheaters().then(nsData => {
            if (nsData && nsData.viral && nsData.viral.length > 0) {
                document.getElementById('homeNetshortSection').style.display = 'block';
                Core.renderCards(nsData.viral, 'homeListNS', true);
            }
        }).catch(console.error);

        // Melolo
        Melolo.fetchHome().then(meloloData => {
            if (meloloData && meloloData.trending && meloloData.trending.length > 0) Core.renderCards(meloloData.trending, 'homeListMeloloTrend', true);
            if (meloloData && meloloData.latest && meloloData.latest.length > 0) Core.renderCards(meloloData.latest, 'homeListMeloloNew', true);
        }).catch(console.error);
    },

    loadMoreHomeDB: async () => {
        try { const data = await Dramabox.fetchHome(Core.pageDB, 50); if (data.length > 0) { Core.renderCards(data, 'homeGridDB'); Core.pageDB++; } else alert("Sudah habis!"); } catch(e){}
    },

    loadExplore: async () => {
        if (Core.exploreLoading) return;
        Core.exploreLoading = true;
        const container = document.getElementById('exploreGrid');
        try {
            if(Core.pageExplore > 1) { const s = document.createElement('div'); s.className = 'loading-spinner-item'; container.appendChild(s); }
            const data = await Netshort.fetchExplore(Core.pageExplore);
            container.querySelectorAll('.loading-spinner-item').forEach(s => s.remove());
            if (data && data.length > 0) { Core.renderCards(data, 'exploreGrid'); Core.pageExplore++; }
        } catch(e){}
        Core.exploreLoading = false;
    },

    loadDubbed: async () => {
        const container = document.getElementById('dubbedGrid');
        if(container.children.length > 1) return;
        let dbData = []; let nsData = [];
        try { dbData = await Dramabox.fetchDubbed(1, 50); } catch(e){}
        try { const nsAll = await Netshort.fetchTheaters(); nsData = nsAll.dubbing || []; } catch(e){}
        const combined = [...nsData, ...dbData];
        if (combined.length > 0) { Core.renderCards(combined, 'dubbedGrid'); Core.pageDubbed++; }
    },
    
    loadMoreDubbed: async () => { try { const data = await Dramabox.fetchDubbed(Core.pageDubbed, 50); if (data.length > 0) { Core.renderCards(data, 'dubbedGrid'); Core.pageDubbed++; } } catch(e){} },
    loadVIP: async () => { /* Logika VIP sama seperti sebelumnya, dipersingkat di sini */ Dramabox.fetchVIP().then(sections => { const container = document.getElementById('vipGrid'); container.innerHTML=''; sections.forEach(sec => { if(sec.list.length===0)return; const t=document.createElement('h3');t.innerText=sec.title;t.style.gridColumn="1/-1";t.style.margin="20px 0 10px 0";t.style.borderLeft="4px solid #E91E63";t.style.paddingLeft="10px";container.appendChild(t); const w=document.createElement('div');w.id='vip-'+Math.random().toString(36).substr(2,9);w.className='grid-container';w.style.gridColumn="1/-1";container.appendChild(w); Core.renderCards(sec.list, w.id); }); }); },

    // --- SEARCH ---
    openSearchPage: () => {
        switchTab('searchPage', true); document.getElementById('searchKeyword').innerText = "Jelajahi"; document.getElementById('searchGrid').innerHTML = ''; document.getElementById('searchInput').value = ''; 
        const catSection = document.getElementById('searchCategories'); if(catSection) catSection.style.display = 'block';
        const genres = ["💖 Romantis", "💼 CEO", "😢 Sad Ending", "🤬 Balas Dendam", "🤰 Hamil & Lari", "✨ Fantasi", "🤣 Komedi", "👑 Kerajaan", "🎬 Action"];
        const genreList = document.getElementById('genreList');
        if(genreList) { genreList.innerHTML = ''; genres.forEach(g => { const chip = document.createElement('div'); chip.className = 'tag-chip'; chip.innerText = g; chip.onclick = () => { const k = g.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim(); document.getElementById('searchInput').value = k; Core.handleSearch(); }; genreList.appendChild(chip); }); }
        setTimeout(() => document.getElementById('searchInput').removeAttribute('readonly'), 500);
    },

    handleSearch: async () => {
        const keyword = document.getElementById('searchInput').value; if (!keyword) return;
        document.getElementById('searchCategories').style.display = 'none';
        document.getElementById('searchPage').style.display = 'block';
        document.getElementById('searchKeyword').innerText = keyword;
        document.getElementById('searchGrid').innerHTML = '<div class="loading-spinner"></div>';
        
        const results = await Promise.allSettled([ Melolo.search(keyword), Dramabox.search(keyword), Netshort.search(keyword) ]);
        const combined = [...(results[0].status==='fulfilled'?results[0].value:[]), ...(results[2].status==='fulfilled'?results[2].value:[]), ...(results[1].status==='fulfilled'?results[1].value:[])];
        const container = document.getElementById('searchGrid'); container.innerHTML = '';
        if (combined.length > 0) Core.renderCards(combined, 'searchGrid'); else container.innerHTML = '<p style="text-align:center;width:100%">Tidak ditemukan.</p>';
    },

    // --- RENDER (RAHASIA GAMBAR MELOLO: WSRV.NL) ---
    renderCards: (list, containerId, isHorizontal = false) => {
        const container = document.getElementById(containerId); if(!container) return;
        const spinner = container.querySelector('.loading-spinner'); if(spinner && !container.querySelector('.card')) spinner.remove();
        
        list.forEach(item => {
            const div = document.createElement('div'); div.className = 'card';
            div.onclick = () => Core.openPlayer(item.source, item.id);
            
            let badgeHtml = item.source === 'melolo' ? `<div class="card-badge" style="background: linear-gradient(45deg, #FF9800, #F44336);">${item.label || 'Melolo'}</div>` : (item.label ? `<div class="card-badge">${item.label==='Anggota Saja'?'Gratis':item.label}</div>` : '');
            let viewHtml = item.score ? `<div style="position:absolute; bottom:35px; left:8px; font-size:0.7rem; color:#ddd; text-shadow:1px 1px 2px black;"><i class="fas fa-eye"></i> ${item.score}</div>` : '';
            
            // FIX: Gunakan proxy wsrv.nl KHUSUS MELOLO
            let finalCover = item.cover;
            if(item.source === 'melolo') finalCover = `https://wsrv.nl/?url=${encodeURIComponent(item.cover)}&output=webp`;

            div.innerHTML = `<div class="card-img-wrapper"><img src="${finalCover}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'"><div class="card-overlay"><div class="card-title">${item.title}</div></div>${badgeHtml}${viewHtml}</div>`;
            container.appendChild(div);
        });
    },

    // --- PLAYER ---
    openPlayer: async (source, id) => {
        Core.activeFetchId = Date.now(); const thisReq = Core.activeFetchId; Core.currentSource = source;
        const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage']; pages.forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('playerPage').style.display = 'block'; window.scrollTo(0, 0); history.pushState({ page: 'player' }, "", "#player");

        const video = document.getElementById('mainVideo'); video.src = ""; video.poster = ""; video.removeAttribute('crossorigin'); video.querySelectorAll('track').forEach(t => t.remove()); 
        document.getElementById('detailTitle').innerText = "Memuat..."; document.getElementById('detailDesc').innerText = ""; document.getElementById('episodeGrid').innerHTML = '<div class="loading-spinner"></div>';
        
        let details = null;
        try { if(source==='db') details=await Dramabox.fetchDetail(id); else if(source==='ns') details=await Netshort.fetchDetail(id); else if(source==='melolo') details=await Melolo.fetchDetail(id); } catch(e){}
        if (Core.activeFetchId !== thisReq) return; if (!details) { alert("Gagal memuat detail drama."); return; }

        Core.currentEpisodeList = details.episodes; Core.currentEpisodeIndex = 0; Core.currentDramaTitle = details.title;
        Core.currentDramaDetails = { source: source, id: id, title: details.title, cover: details.cover, label: 'Disimpan' };

        document.getElementById('detailTitle').innerText = details.title; document.getElementById('detailDesc').innerText = details.intro || "-"; document.getElementById('detailEps').innerText = `${details.totalEps} Eps`;
        
        // FIX: Proxy Poster Melolo
        video.poster = source === 'melolo' ? `https://wsrv.nl/?url=${encodeURIComponent(details.cover)}&output=webp` : details.cover;
        document.getElementById('detailSource').innerText = source === 'db' ? 'Dramabox' : (source === 'ns' ? 'Netshort' : 'Melolo');
        Core.checkSaveStatus(id); Core.saveToHistory({ source: source, id: id, title: details.title, cover: details.cover, label: 'Terakhir' });

        const epGrid = document.getElementById('episodeGrid'); epGrid.innerHTML = '';
        details.episodes.forEach((ep, index) => { const btn = document.createElement('button'); btn.className = 'ep-btn'; btn.innerText = ep.name.replace(/^(Episode|EP)\s?/i, ''); btn.onclick = () => Core.playSpecificEpisode(index); epGrid.appendChild(btn); });
        if (details.episodes.length > 0) Core.playSpecificEpisode(0); Core.loadRecommendations();
    },

    playSpecificEpisode: async (index) => {
        const video = document.getElementById('mainVideo'); document.getElementById('autoNextOverlay').style.display = 'none'; if(Core.autoNextTimer) clearInterval(Core.autoNextTimer);
        Core.currentEpisodeIndex = index; const ep = Core.currentEpisodeList[index]; if(!ep) return;
        let streamUrl = ep.url;
        if (Core.currentSource === 'melolo') { try { const fetchUrl = await Melolo.fetchStream(ep.vid); if(fetchUrl) streamUrl = fetchUrl; else { alert("Gagal mengambil link video."); return; } } catch(e) { alert("Error Stream Melolo"); return; } }
        if (Core.currentSource === 'ns') video.setAttribute('crossorigin', 'anonymous'); else video.removeAttribute('crossorigin');
        video.src = streamUrl; video.querySelectorAll('track').forEach(t => t.remove());
        if (ep.subtitles && ep.subtitles.length > 0) { const sub = ep.subtitles.find(s => s.lang === 'id_ID') || ep.subtitles[0]; if (sub && sub.url) { const track = document.createElement('track'); track.kind = 'subtitles'; track.label = 'Indonesia'; track.srclang = 'id'; track.src = sub.url; track.default = true; video.appendChild(track); } }
        video.play().catch(console.log); window.scrollTo(0, 0);
        document.querySelectorAll('.ep-btn').forEach((b, i) => { if(i === index) b.classList.add('active'); else b.classList.remove('active'); });
        const nextBtn = document.getElementById('btnNextEp'); if (index < Core.currentEpisodeList.length - 1) { nextBtn.disabled = false; nextBtn.innerHTML = `Next (${index + 2}) <i class="fas fa-forward"></i>`; } else { nextBtn.disabled = true; nextBtn.innerHTML = `Tamat <i class="fas fa-check"></i>`; }
    },

    shareDrama: () => { window.open(`https://wa.me/?text=${encodeURIComponent('Nonton '+Core.currentDramaTitle+' di Dramaci!')}`, '_blank'); },
    loadRecommendations: async () => { try { const nsData = await Netshort.fetchTheaters(); const allList = [...(nsData.viral || []), ...(nsData.dubbing || [])].sort(() => 0.5 - Math.random()); Core.renderCards(allList.slice(0, 6), 'recList'); } catch(e){} },
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
    goBack: () => { history.back(); }
};

function switchTab(t,p=true){ const pages=['homePage','explorePage','dubbedPage','vipPage','historyPage','searchPage','playerPage']; pages.forEach(el=>document.getElementById(el).style.display='none'); document.getElementById('mainVideo').pause(); document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active')); if(t==='home'){document.getElementById('homePage').style.display='block';document.getElementById('nav-home').classList.add('active');} else if(t==='explore'){document.getElementById('explorePage').style.display='block';document.getElementById('nav-explore').classList.add('active');if(document.getElementById('exploreGrid').children.length<=1)Core.loadExplore();} else if(t==='dubbed'){document.getElementById('dubbedPage').style.display='block';document.getElementById('nav-dubbed').classList.add('active');Core.loadDubbed();} else if(t==='vip'){document.getElementById('vipPage').style.display='block';document.getElementById('nav-vip').classList.add('active');Core.loadVIP();} else if(t==='history'){document.getElementById('historyPage').style.display='block';document.getElementById('nav-history').classList.add('active');Core.loadHistory();} if(p)history.pushState({page:t},"",`#${t}`); window.scrollTo(0,0); }
function toggleMenu(){document.getElementById('sidebar').classList.toggle('active');document.querySelector('.sidebar-overlay').classList.toggle('active');}
document.addEventListener("DOMContentLoaded", Core.init);

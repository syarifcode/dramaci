const Core = {
    // --- STATE ---
    pageDB: 1,
    pageExplore: 1,
    pageDubbed: 1,
    loadedIds: new Set(),
    exploreLoading: false,
    historyKey: 'dramaci_v8_history',

    // --- INIT ---
    init: () => {
        // Event Listeners
        document.getElementById('searchInput').addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                Core.handleSearch();
                document.getElementById('searchInput').blur();
            }
        });

        // Infinite Scroll untuk Explore
        window.addEventListener('scroll', () => {
            if (document.getElementById('explorePage').style.display !== 'none') {
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                    Core.loadExplore();
                }
            }
        });

        // Load Initial Data
        Core.loadHome();
        Core.loadHistory();
        
        // Handle Back Button
        window.onpopstate = (e) => {
            if(e.state && e.state.page) switchTab(e.state.page, false);
            else switchTab('home', false);
        };
    },

    // --- HOME LOGIC ---
    loadHome: async () => {
        // 1. Load Dramabox Trending
        const dbData = await Dramabox.fetchHome(1, 50);
        Core.renderCards(dbData, 'homeGridDB');
        Core.pageDB++;

        // 2. Load Netshort Viral (Horizontal)
        const nsData = await Netshort.fetchTheaters();
        if (nsData.viral && nsData.viral.length > 0) {
            Core.renderCards(nsData.viral, 'homeListNS', true); // true = horizontal mode
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

    // --- EXPLORE LOGIC (Infinite Scroll) ---
    loadExplore: async () => {
        if (Core.exploreLoading) return;
        Core.exploreLoading = true;
        
        const container = document.getElementById('exploreGrid');
        // Tampilkan spinner kecil jika bukan load pertama
        if(Core.pageExplore > 1) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner-item';
            container.appendChild(spinner);
        }

        const data = await Netshort.fetchExplore(Core.pageExplore);
        
        // Hapus spinner item
        const spinners = container.querySelectorAll('.loading-spinner-item');
        spinners.forEach(s => s.remove());
        // Hapus spinner utama jika ada
        const mainSpinner = container.querySelector('.loading-spinner');
        if(mainSpinner) mainSpinner.remove();

        if (data.length > 0) {
            Core.renderCards(data, 'exploreGrid');
            Core.pageExplore++;
        }
        Core.exploreLoading = false;
    },

    // --- DUBBING LOGIC (Gabungan) ---
    loadDubbed: async () => {
        const container = document.getElementById('dubbedGrid');
        if(container.children.length > 1) return; // Jangan load kalau sudah ada isi

        // Load DB Dubbed
        const dbData = await Dramabox.fetchDubbed(1, 50);
        Core.renderCards(dbData, 'dubbedGrid');
        Core.pageDubbed++;
        
        // Note: Netshort Dubbing bisa ditambahkan di sini jika mau digabung
    },

    loadMoreDubbed: async () => {
        const data = await Dramabox.fetchDubbed(Core.pageDubbed, 50);
        if (data.length > 0) {
            Core.renderCards(data, 'dubbedGrid');
            Core.pageDubbed++;
        }
    },

    // --- VIP LOGIC ---
    loadVIP: async () => {
        const container = document.getElementById('vipGrid');
        if(container.children.length > 1) return;

        const sections = await Dramabox.fetchVIP();
        container.innerHTML = '';
        
        sections.forEach(sec => {
            if(sec.list.length === 0) return;
            
            const title = document.createElement('h3');
            title.innerText = sec.title;
            title.style.gridColumn = "1 / -1";
            title.style.margin = "20px 0 10px 0";
            title.style.borderLeft = "4px solid #FFD700";
            title.style.paddingLeft = "10px";
            container.appendChild(title);

            const wrapperId = `vip-${Math.random().toString(36).substr(2, 9)}`;
            const wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.className = 'grid-container';
            wrapper.style.gridColumn = "1 / -1";
            container.appendChild(wrapper);

            Core.renderCards(sec.list, wrapperId);
        });
    },

    // --- SEARCH LOGIC (Gabungan) ---
    handleSearch: async () => {
        const keyword = document.getElementById('searchInput').value;
        if (!keyword) return;

        // UI Reset
        const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'playerPage'];
        pages.forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('searchPage').style.display = 'block';
        document.getElementById('searchKeyword').innerText = keyword;
        document.getElementById('searchGrid').innerHTML = '<div class="loading-spinner"></div>';

        // Parallel Fetch (Balapan!)
        const [dbResults, nsResults] = await Promise.all([
            Dramabox.search(keyword),
            Netshort.search(keyword)
        ]);

        const container = document.getElementById('searchGrid');
        container.innerHTML = '';

        const combined = [...nsResults, ...dbResults]; // Netshort duluan biar variatif

        if (combined.length > 0) {
            Core.renderCards(combined, 'searchGrid');
        } else {
            container.innerHTML = '<p style="text-align:center;width:100%">Tidak ditemukan.</p>';
        }
    },

    // --- RENDER ENGINE (Standardized) ---
    renderCards: (list, containerId, isHorizontal = false) => {
        const container = document.getElementById(containerId);
        if(!container) return;

        // Hapus spinner awal jika ada
        const spinner = container.querySelector('.loading-spinner');
        if(spinner && !container.querySelector('.card')) spinner.remove();

        list.forEach(item => {
            // Anti Duplikat Global (Optional, dimatikan dulu biar banyak konten)
            // if (Core.loadedIds.has(item.id)) return;
            // Core.loadedIds.add(item.id);

            const div = document.createElement('div');
            div.className = 'card';
            // PENTING: Passing source dan ID
            div.onclick = () => Core.openPlayer(item.source, item.id);

            // Badge Logic
            let badgeHtml = '';
            if (item.label) {
                // Style Emas untuk VIP/Premium
                const isPremium = ['VIP', 'Berbayar', 'Premium'].includes(item.label);
                const badgeClass = isPremium ? 'card-badge premium-style' : 'card-badge';
                // Ubah text jika perlu
                let labelText = item.label;
                if(labelText === 'Anggota Saja') labelText = 'Gratis';
                
                badgeHtml = `<div class="${badgeClass}">${labelText}</div>`;
            }

            // View Count (Untuk Netshort)
            let viewHtml = '';
            if (item.score) {
                viewHtml = `<div style="position:absolute; bottom:35px; left:8px; font-size:0.7rem; color:#ddd; text-shadow:1px 1px 2px black;">
                                <i class="fas fa-eye"></i> ${item.score}
                            </div>`;
            }

            div.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${item.cover}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    <div class="card-overlay"><div class="card-title">${item.title}</div></div>
                    ${badgeHtml}
                    ${viewHtml}
                </div>`;
            
            container.appendChild(div);
        });
    },

    // --- PLAYER LOGIC (Dual Source) ---
    openPlayer: async (source, id) => {
        // 1. UI Preparation (Fix Bug Numpuk)
        const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage'];
        pages.forEach(p => document.getElementById(p).style.display = 'none');
        document.getElementById('playerPage').style.display = 'block';
        window.scrollTo(0, 0);
        history.pushState({ page: 'player' }, "", "#player");

        // 2. Reset Player
        const video = document.getElementById('mainVideo');
        video.src = "";
        video.poster = "";
        document.getElementById('detailTitle').innerText = "Memuat...";
        document.getElementById('detailDesc').innerText = "";
        document.getElementById('episodeGrid').innerHTML = '<div class="loading-spinner"></div>';
        document.getElementById('detailSource').innerText = source === 'db' ? 'Dramabox' : 'Netshort';

        // 3. Fetch Detail sesuai Provider
        let details = null;
        if (source === 'db') details = await Dramabox.fetchDetail(id);
        else if (source === 'ns') details = await Netshort.fetchDetail(id);

        if (!details) {
            alert("Gagal memuat detail drama.");
            return;
        }

        // 4. Render Detail
        document.getElementById('detailTitle').innerText = details.title;
        document.getElementById('detailDesc').innerText = details.intro;
        document.getElementById('detailEps').innerText = `${details.totalEps} Eps`;
        video.poster = details.cover;

        // Save History
        Core.saveToHistory({
            source: source,
            id: id,
            title: details.title,
            cover: details.cover,
            label: 'Terakhir'
        });

        // 5. Render Episodes
        const epGrid = document.getElementById('episodeGrid');
        epGrid.innerHTML = '';
        
        details.episodes.forEach((ep, index) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn';
            btn.innerText = ep.name.replace('Episode ', '').replace('EP ', '');
            
            btn.onclick = () => {
                // Play Video
                video.src = ep.url;
                video.play();
                window.scrollTo(0, 0);
                
                // Active State
                document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            epGrid.appendChild(btn);
        });

        // Auto Play Eps 1
        if (details.episodes.length > 0) {
            video.src = details.episodes[0].url;
            epGrid.children[0].classList.add('active');
        }
    },

    scrollToEpisodes: () => {
        document.getElementById('episodeSection').scrollIntoView({ behavior: 'smooth' });
    },

    goBack: () => {
        history.back();
    },

    // --- HISTORY LOGIC ---
    saveToHistory: (item) => {
        let history = JSON.parse(localStorage.getItem(Core.historyKey) || '[]');
        // Hapus duplikat lama
        history = history.filter(h => h.id !== item.id);
        // Tambah ke depan
        history.unshift(item);
        // Limit 50
        if (history.length > 50) history.pop();
        localStorage.setItem(Core.historyKey, JSON.stringify(history));
    },

    loadHistory: () => {
        const history = JSON.parse(localStorage.getItem(Core.historyKey) || '[]');
        const container = document.getElementById('historyGrid');
        container.innerHTML = '';
        if (history.length > 0) {
            Core.renderCards(history, 'historyGrid');
        } else {
            container.innerHTML = '<p style="text-align:center;width:100%">Belum ada riwayat.</p>';
        }
    },

    clearHistory: () => {
        if(confirm("Hapus semua?")) {
            localStorage.removeItem(Core.historyKey);
            Core.loadHistory();
        }
    }
};

// --- GLOBAL NAV HELPER ---
// Fungsi ini dipanggil dari onclick HTML
function switchTab(tabName, pushHistory = true) {
    const pages = ['homePage', 'explorePage', 'dubbedPage', 'vipPage', 'historyPage', 'searchPage', 'playerPage'];
    pages.forEach(p => document.getElementById(p).style.display = 'none');

    // Pause Video
    const video = document.getElementById('mainVideo');
    video.pause(); video.src = "";

    // Reset Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Logic Per Tab
    if (tabName === 'home') {
        document.getElementById('homePage').style.display = 'block';
        document.getElementById('nav-home').classList.add('active');
    }
    else if (tabName === 'explore') {
        document.getElementById('explorePage').style.display = 'block';
        document.getElementById('nav-explore').classList.add('active');
        // Auto load if empty
        if(document.getElementById('exploreGrid').children.length <= 1) Core.loadExplore();
    }
    else if (tabName === 'dubbed') {
        document.getElementById('dubbedPage').style.display = 'block';
        document.getElementById('nav-dubbed').classList.add('active');
        Core.loadDubbed();
    }
    else if (tabName === 'vip') {
        document.getElementById('vipPage').style.display = 'block';
        document.getElementById('nav-vip').classList.add('active');
        Core.loadVIP();
    }
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

// Start App
document.addEventListener("DOMContentLoaded", Core.init);

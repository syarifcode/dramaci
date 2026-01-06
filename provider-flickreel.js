const Flickreel = {
    base: '/api/flick',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${Flickreel.base}${endpoint}`);
            if (!res.ok) throw new Error("Flick API Error");
            return await res.json();
        } catch (e) {
            console.error("Flick Fetch Error:", e);
            return null;
        }
    },

    // --- 1. HOME (FOR YOU) ---
    // Update: Mengambil Hero, Ranking, DAN Favorite (untuk Trending)
    fetchForYou: async () => {
        const res = await Flickreel.smartFetch('/foryou');
        if (!res || !res.data) return { hero: [], rank: [], fav: [] };

        let heroList = [];
        let rankList = [];
        let favList = [];

        res.data.forEach(section => {
            // 1. Gabung Karusel & Drama Laris -> HERO
            if (section.title === "Karusel" || section.title.includes("Drama Laris")) {
                if (section.list) {
                    heroList = [...heroList, ...section.list.map(Flickreel.mapItem)];
                }
            }
            // 2. Peringkat -> RANKING SLIDER
            else if (section.title.includes("Peringkat")) {
                if (section.list) {
                    // Filter item header ranking (id=0)
                    const items = section.list.filter(i => i.playlet_id !== 0).map(Flickreel.mapItem);
                    rankList = [...rankList, ...items];
                }
            }
            // 3. Drama Favorit (Section 4) -> BUAT TRENDING GRID
            else if (section.title.includes("favorit")) {
                if (section.list) {
                    // Filter item jebakan ranking di tengah list
                    const items = section.list.filter(i => i.playlet_id !== 0).map(Flickreel.mapItem);
                    favList = [...favList, ...items];
                }
            }
        });

        // Acak Hero biar fresh
        heroList.sort(() => 0.5 - Math.random());

        return { hero: heroList, rank: rankList, fav: favList };
    },

    // --- 2. LATEST ---
    fetchLatest: async () => {
        const res = await Flickreel.smartFetch('/latest');
        if (!res || !res.data || !res.data[0] || !res.data[0].list) return [];
        return res.data[0].list.map(Flickreel.mapItem);
    },

    // --- 3. SEARCH ---
    search: async (keyword) => {
        const res = await Flickreel.smartFetch(`/search?query=${encodeURIComponent(keyword)}`);
        const list = (res && res.data && Array.isArray(res.data)) ? res.data : [];
        return list.map(item => ({
            source: 'flick',
            id: item.playlet_id,
            title: item.title,
            cover: item.cover,
            label: 'Flickreel',
            score: item.upload_num ? `${item.upload_num} Eps` : 'Seru'
        }));
    },

    // --- 4. DETAIL & STREAM ---
    fetchDetail: async (id) => {
        const res = await Flickreel.smartFetch(`/detailAndAllEpisode?id=${id}`);
        if (!res || !res.drama) return null;

        const d = res.drama;
        const eps = res.episodes || [];

        return {
            source: 'flick',
            id: id,
            title: d.title,
            cover: d.cover,
            intro: d.description || "Sinopsis tidak tersedia.",
            totalEps: d.chapterCount,
            episodes: eps.map(ep => ({
                index: ep.index,
                name: ep.name,
                isLocked: false, 
                url: ep.raw ? ep.raw.videoUrl : "" 
            })),
            recommendations: []
        };
    },

    mapItem: (item) => {
        let label = 'Flickreel';
        if (item.playlet_tag_name && item.playlet_tag_name.length > 0) {
            label = item.playlet_tag_name[0];
        }
        return {
            source: 'flick',
            id: item.playlet_id,
            title: item.title,
            cover: item.cover,
            score: item.hot_num || 'Baru',
            label: label
        };
    }
};

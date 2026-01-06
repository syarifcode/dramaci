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
    fetchForYou: async () => {
        const res = await Flickreel.smartFetch('/foryou');
        if (!res || !res.data) return { hero: [], rank: [] };

        let heroList = [];
        let rankList = [];

        res.data.forEach(section => {
            // Gabung Karusel & Drama Laris untuk Slider Utama
            if (section.title === "Karusel" || section.title.includes("Drama Laris")) {
                if (section.list) {
                    heroList = [...heroList, ...section.list.map(Flickreel.mapItem)];
                }
            }
            // Pisahkan Peringkat
            else if (section.title.includes("Peringkat")) {
                if (section.list) {
                    // Filter item header (id=0)
                    const items = section.list.filter(i => i.playlet_id !== 0).map(Flickreel.mapItem);
                    rankList = [...rankList, ...items];
                }
            }
        });

        // Acak urutan Hero biar fresh
        heroList.sort(() => 0.5 - Math.random());

        return { hero: heroList, rank: rankList };
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

    // --- 4. DETAIL & STREAM (GRATIS) ---
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
                isLocked: false, // Selalu terbuka
                url: ep.raw ? ep.raw.videoUrl : "" // Link langsung
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

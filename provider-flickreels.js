const Flick = {
    apiBase: '/api/flick',

    smartFetch: async (endpoint) => {
        try {
            const sep = endpoint.includes('?') ? '&' : '?';
            const res = await fetch(`${Flick.apiBase}${endpoint}${sep}lang=in`);
            if (!res.ok) throw new Error("Fetch Error");
            return await res.json();
        } catch (e) { return null; }
    },

    // 1. HOME (Slider & List Biasa)
    fetchHome: async () => {
        const res = await Flick.smartFetch('/home?page=1&p_size=20');
        if (!res || !res.data) return { slider: [], list: [] };

        let slider = [];
        let list = [];

        res.data.forEach(section => {
            // Ambil Slider
            if (section.style == 5 || section.title.includes("Karusel")) {
                slider = section.list.map(Flick.mapBook);
            } 
            // Ambil List Biasa (Filter yang bukan ranking)
            else if (section.list && section.list.length > 0 && section.style != 8) {
                const validItems = section.list.filter(x => x.playlet_id != 0).map(Flick.mapBook);
                list = [...list, ...validItems];
            }
        });

        return { slider, list: Flick.removeDuplicates(list) };
    },

    // 2. VIP (FITUR BARU: Ambil Data Ranking/Hot)
    fetchVIP: async () => {
        const res = await Flick.smartFetch('/home?page=1&p_size=20');
        if (!res || !res.data) return [];

        let vipList = [];
        // Cari section Ranking (biasanya style 8 atau title Peringkat)
        const rankSection = res.data.find(s => s.style == 8 || s.title.includes("Peringkat") || s.title.includes("Hot"));
        
        if (rankSection && rankSection.list) {
            // Kadang di dalam list ada 'rank_list' lagi
            rankSection.list.forEach(item => {
                if(item.rank_list && item.rank_list.length > 0) {
                    vipList.push(...item.rank_list.map(Flick.mapBook));
                } else if (item.playlet_id != 0) {
                    vipList.push(Flick.mapBook(item));
                }
            });
        }
        
        // Kalau kosong, ambil sembarang list biar ga kosong
        if(vipList.length === 0 && res.data[1]) {
             vipList = res.data[1].list.map(Flick.mapBook);
        }

        return Flick.removeDuplicates(vipList);
    },

    // 3. SEARCH
    search: async (keyword) => {
        const res = await Flick.smartFetch(`/search?q=${encodeURIComponent(keyword)}&page=1&p_size=20`);
        if (!res || !res.data) return [];
        return res.data.map(Flick.mapBook);
    },

    // 4. DETAIL
    fetchDetail: async (id) => {
        const res = await Flick.smartFetch(`/play?id=${id}`);
        if (!res || !res.data) return null;

        const d = res.data;
        const eps = (d.list || []).map(ep => ({
            index: ep.chapter_num,
            name: `Ep ${ep.chapter_num}`,
            vid: ep.chapter_id,
            cover: ep.chapter_cover,
            url: ep.hls_url
        }));

        return {
            source: 'flick',
            title: d.title,
            cover: d.cover,
            intro: d.introduce || "Sinopsis tidak tersedia.",
            totalEps: d.list.length,
            episodes: eps
        };
    },

    mapBook: (b) => ({
        source: 'flick',
        id: b.playlet_id,
        title: b.title,
        cover: b.cover,
        poster: b.background,
        score: (b.upload_num || b.hot_num || 'Full') + ' Eps',
        label: 'Flickreels'
    }),

    removeDuplicates: (arr) => {
        const unique = [];
        const seen = new Set();
        for (const item of arr) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
            }
        }
        return unique;
    }
};
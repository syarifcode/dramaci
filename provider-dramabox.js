const DramaboxV2 = {
    // Base URL sesuai Vercel Rewrite
    base: '/api',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${DramaboxV2.base}${endpoint}`);
            if (!res.ok) throw new Error("DB API Error");
            return await res.json();
        } catch (e) {
            console.error("DB Fetch Error:", e);
            return null;
        }
    },

    // 1. HOME TRENDING
    fetchTrending: async () => {
        const res = await DramaboxV2.smartFetch('/home');
        if (!res || !res.data || !res.data.list) return [];
        
        return res.data.list.map(item => ({
            source: 'db',
            id: item.book_id,
            title: item.book_name,
            cover: item.cover_url,
            score: item.hot_index || 'Hot',
            label: 'Dramabox'
        }));
    },

    // 2. LATEST (BARU RILIS)
    fetchLatest: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/category/newest?page=${page}`);
        const list = (res && res.data && res.data.list) ? res.data.list : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id,
            title: item.book_name,
            cover: item.cover_url,
            score: 'Baru',
            label: 'Dramabox'
        }));
    },

    // 3. DUBBING INDO
    fetchDubbed: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/dubbed?page=${page}`);
        // Kadang return array langsung, kadang object list
        const list = (res && res.data) ? (Array.isArray(res.data) ? res.data : res.data.list) : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id,
            title: item.book_name,
            cover: item.cover_url,
            score: 'Indo',
            label: 'Dubbing'
        }));
    },

    // 4. SEARCH
    search: async (keyword) => {
        const res = await DramaboxV2.smartFetch(`/search?keyword=${encodeURIComponent(keyword)}`);
        const list = (res && res.data) ? res.data : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id,
            title: item.book_name,
            cover: item.cover_url,
            score: 'Search',
            label: 'Dramabox'
        }));
    },

    // 5. VIP LIST
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if(!res || !res.data) return [];
        
        return res.data.map(sec => ({
            title: sec.title,
            list: (sec.list || []).map(item => ({
                source: 'db',
                id: item.book_id,
                title: item.book_name,
                cover: item.cover_url,
                score: 'VIP',
                label: 'Premium'
            }))
        }));
    },

    // 6. DETAIL & STREAM
    fetchDetail: async (id) => {
        const res = await DramaboxV2.smartFetch(`/detail?id=${id}`);
        if (!res || !res.data || !res.data.book) return null;

        const b = res.data.book;
        const chapters = res.data.chapter_list || [];

        return {
            source: 'db',
            id: b.book_id,
            title: b.book_name,
            cover: b.cover_url,
            intro: b.summary || "Sinopsis tidak tersedia.",
            totalEps: chapters.length,
            episodes: chapters.map((ep, idx) => ({
                index: idx,
                name: `Episode ${idx + 1}`,
                // Cek url atau video_url, fallback ke string kosong
                url: ep.url || ep.video_url || "", 
                isLocked: false
            })),
            recommendations: (res.data.recommends || []).map(item => ({
                source: 'db',
                id: item.book_id,
                title: item.book_name,
                cover: item.cover_url,
                score: 'Rec',
                label: 'Dramabox'
            }))
        };
    }
};

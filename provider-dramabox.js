const DramaboxV2 = {
    // GANTI KE '/api' AGAR LEWAT PROXY VERCEL (ANTI BLOKIR & LEBIH CEPAT)
    base: '/api',

    smartFetch: async (endpoint) => {
        try {
            // Gunakan base '/api' bukan url panjang
            const res = await fetch(`${DramaboxV2.base}${endpoint}`);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) {
            console.error("DB Fetch Error:", e);
            return null;
        }
    },

    // 1. HOME & TRENDING
    // Di vercel.json, /api/home mengarah ke trending
    fetchTrending: async () => {
        const res = await DramaboxV2.smartFetch('/home');
        if (!res || !res.data || !res.data.list) return [];
        
        return res.data.list.map(DramaboxV2.mapBook);
    },

    // 2. LATEST
    fetchLatest: async (page = 1) => {
        // Gunakan endpoint category yang stabil lewat proxy
        const res = await DramaboxV2.smartFetch(`/categories?page=${page}&type=newest`); 
        // Fallback jika endpoint beda, sesuaikan dengan proxy yang ada
        if (!res) return [];
        
        const list = (res.data && res.data.list) ? res.data.list : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 3. VIP PAGE
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if (!res || !res.data) return [];

        // Struktur data proxy biasanya ada di res.data
        const rawList = Array.isArray(res.data) ? res.data : (res.data.columnVoList || []);

        return rawList.map(col => ({
            title: col.title,
            list: (col.list || col.bookList || []).map(DramaboxV2.mapBook)
        }));
    },

    // 4. DUBBING INDO
    fetchDubbed: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/dubbed?page=${page}`);
        const list = (res && res.data) ? (Array.isArray(res.data) ? res.data : res.data.list) : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 5. SEARCH
    search: async (query) => {
        const res = await DramaboxV2.smartFetch(`/search?keyword=${encodeURIComponent(query)}`);
        const list = (res && res.data) ? res.data : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 6. DETAIL & STREAM (FIX "GAGAL MEMUAT")
    fetchDetail: async (bookId) => {
        // Panggil endpoint proxy /detail
        const res = await DramaboxV2.smartFetch(`/detail?id=${bookId}`);
        
        if (!res || !res.data || !res.data.book) return null;

        const b = res.data.book;
        const chapters = res.data.chapter_list || [];

        // Mapping agar player (Core.js) bisa baca
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
                // Proxy biasanya sudah membuka URL video di field ini
                url: ep.url || ep.video_url || "", 
                isLocked: false
            })),
            recommendations: (res.data.recommends || []).map(DramaboxV2.mapBook)
        };
    },

    // HELPER MAPPING (Agar data seragam)
    mapBook: (b) => {
        // Handle variasi nama field dari API
        const id = b.book_id || b.bookId || b.id;
        const title = b.book_name || b.bookName || b.title;
        const cover = b.cover_url || b.cover || b.coverWap || "";
        
        let score = "Seru";
        if (b.hot_index) score = b.hot_index;
        else if (b.playCount) score = b.playCount;

        return {
            source: 'db',
            id: id,
            title: title,
            cover: cover,
            score: score,
            label: 'Dramabox'
        };
    }
};

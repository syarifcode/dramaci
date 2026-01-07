const DramaboxV2 = {
    // --- 1. CONFIG & UTILS ---
    base: '/api', // Menggunakan proxy vercel.json

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${DramaboxV2.base}${endpoint}`);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) {
            console.error("DB Fetch Error:", e);
            return null;
        }
    },

    // --- 2. TRENDING (HOME GRID) ---
    fetchTrending: async () => {
        const res = await DramaboxV2.smartFetch('/home');
        if (!res || !res.data || !res.data.list) return [];
        
        // Filter agar hanya mengambil item yang valid
        return res.data.list.map(item => ({
            source: 'db',
            id: item.book_id || item.id, // Pastikan ID terambil
            title: item.book_name || item.title,
            cover: item.cover_url || item.cover,
            score: item.hot_index || 'Hot',
            label: 'Dramabox'
        }));
    },

    // --- 3. LATEST (BARU RILIS) ---
    fetchLatest: async (page = 1) => {
        // Menggunakan endpoint search kosong atau category untuk simulasi latest
        // Atau endpoint khusus jika ada. Di sini kita pakai logic category/newest
        const res = await DramaboxV2.smartFetch(`/category/newest?page=${page}`);
        const list = (res && res.data && res.data.list) ? res.data.list : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id || item.id,
            title: item.book_name || item.title,
            cover: item.cover_url || item.cover,
            score: 'Baru',
            label: 'Dramabox'
        }));
    },

    // --- 4. DUBBING INDO ---
    fetchDubbed: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/dubbed?page=${page}`);
        const list = (res && res.data) ? res.data : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id || item.id,
            title: item.book_name || item.title,
            cover: item.cover_url || item.cover,
            score: 'Indo',
            label: 'Dubbing'
        }));
    },

    // --- 5. SEARCH ---
    search: async (keyword) => {
        const res = await DramaboxV2.smartFetch(`/search?keyword=${encodeURIComponent(keyword)}`);
        const list = (res && res.data) ? res.data : [];
        
        return list.map(item => ({
            source: 'db',
            id: item.book_id || item.id,
            title: item.book_name || item.title,
            cover: item.cover_url || item.cover,
            score: 'Search',
            label: 'Dramabox'
        }));
    },

    // --- 6. VIP LIST ---
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if(!res || !res.data) return [];
        
        // Mapping struktur section VIP
        return res.data.map(sec => ({
            title: sec.title,
            list: (sec.list || []).map(item => ({
                source: 'db',
                id: item.book_id || item.id,
                title: item.book_name || item.title,
                cover: item.cover_url || item.cover,
                score: 'VIP',
                label: 'Premium'
            }))
        }));
    },

    // --- 7. DETAIL & STREAM (BAGIAN PENTING) ---
    fetchDetail: async (id) => {
        // Request Detail
        const res = await DramaboxV2.smartFetch(`/detail?id=${id}`);
        if (!res || !res.data) return null;

        const d = res.data;
        const book = d.book || {};
        const chapters = d.chapter_list || [];

        // Pastikan ada episode
        if (chapters.length === 0) return null;

        return {
            source: 'db',
            id: id,
            title: book.book_name || book.title || "Tanpa Judul",
            cover: book.cover_url || book.cover,
            intro: book.summary || "Sinopsis tidak tersedia.",
            totalEps: chapters.length,
            // Mapping Episode List
            episodes: chapters.map((ep, idx) => ({
                index: idx,
                name: `Episode ${idx + 1}`,
                isLocked: false, // Asumsi unlock di frontend proxy
                url: ep.url || ep.video_url || "" // URL Video
            })),
            // Rekomendasi (ambil dari related jika ada, atau kosongkan)
            recommendations: (d.recommends || []).map(item => ({
                source: 'db',
                id: item.book_id || item.id,
                title: item.book_name || item.title,
                cover: item.cover_url || item.cover,
                score: 'Rec',
                label: 'Dramabox'
            }))
        };
    }
};

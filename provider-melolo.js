const Melolo = {
    // Jalur via Vercel Rewrites
    apiBase: '/api/melolo',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${Melolo.apiBase}${endpoint}`);
            if (!res.ok) throw new Error("Fetch Error");
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // --- 1. HOME (MULTI-FETCH 3 HALAMAN) ---
    fetchHome: async () => {
        // Kita panggil offset 0, 10, dan 20 sekaligus biar dapat +/- 30 item
        const p1 = Melolo.smartFetch('/latest?limit=10&offset=0');
        const p2 = Melolo.smartFetch('/latest?limit=10&offset=10');
        const p3 = Melolo.smartFetch('/latest?limit=10&offset=20');
        
        const p4 = Melolo.smartFetch('/trending?limit=10&offset=0');
        const p5 = Melolo.smartFetch('/trending?limit=10&offset=10');
        const p6 = Melolo.smartFetch('/trending?limit=10&offset=20');

        const results = await Promise.all([p1, p2, p3, p4, p5, p6]);

        const process = (res) => {
            // Deteksi struktur (berdasarkan endpoint 1.json)
            if (res && res.books) return res.books.map(Melolo.mapBook);
            if (res && res.data && res.data.books) return res.data.books.map(Melolo.mapBook);
            return [];
        };

        const latest = [...process(results[0]), ...process(results[1]), ...process(results[2])];
        const trending = [...process(results[3]), ...process(results[4]), ...process(results[5])];

        return {
            latest: Melolo.removeDuplicates(latest),
            trending: Melolo.removeDuplicates(trending)
        };
    },

    // --- 2. SEARCH (Sesuai endpoint 3.json) ---
    search: async (keyword) => {
        const res = await Melolo.smartFetch(`/search?query=${encodeURIComponent(keyword)}&limit=30&offset=0`);
        let results = [];
        if (res && res.data && res.data.search_data) {
            res.data.search_data.forEach(group => {
                if (group.books) results.push(...group.books.map(Melolo.mapBook));
            });
        }
        return results;
    },

    // --- 3. DETAIL (Sesuai endpoint 4.json) ---
    fetchDetail: async (bookId) => {
        const res = await Melolo.smartFetch(`/detail?bookId=${bookId}`);
        if (!res || !res.data || !res.data.video_data) return null;

        const data = res.data.video_data;
        return {
            source: 'melolo',
            title: data.series_title,
            cover: data.series_cover,
            intro: data.series_intro || "Sinopsis tidak tersedia.",
            totalEps: data.episode_cnt,
            episodes: (data.video_list || []).map(ep => ({
                index: ep.vid_index,
                name: `Ep ${ep.vid_index}`,
                vid: ep.vid, // Kunci buat ambil stream
                cover: ep.episode_cover || ep.cover,
                duration: ep.duration,
                url: null // URL belum ada, harus fetchStream dulu
            }))
        };
    },

    // --- 4. STREAM (Sesuai endpoint 5.json) ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        // Cek struktur endpoint 5
        if (!res || !res.data) return null;

        let streamUrl = res.data.main_url || res.data.backup_url;
        
        // PENTING: Ubah HTTP ke HTTPS biar jalan di Vercel
        if (streamUrl && streamUrl.startsWith('http://')) {
            streamUrl = streamUrl.replace('http://', 'https://');
        }
        return streamUrl;
    },

    mapBook: (b) => {
        let tag = 'Drama';
        if (b.stat_infos && b.stat_infos.length > 0) tag = b.stat_infos[0].split(',')[0]; 
        return {
            source: 'melolo',
            id: b.book_id,
            title: b.book_name,
            cover: b.thumb_url,
            score: b.serial_count ? b.serial_count + ' Eps' : '', 
            label: tag
        };
    },

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

const Melolo = {
    // API lewat Vercel Rewrites
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

    // --- 1. HOME (OPLOSAN BIAR RAME) ---
    fetchHome: async () => {
        // A. AMBIL DATA MURNI (Dikit)
        const pLatest = Melolo.smartFetch('/latest?limit=10&offset=0');
        const pTrending = Melolo.smartFetch('/trending?limit=10&offset=0');
        
        // B. AMBIL DATA SEARCH (Banyak) - Keyword "CEO" & "Cinta"
        const pSearchCEO = Melolo.smartFetch('/search?query=CEO&limit=20&offset=0');
        const pSearchLove = Melolo.smartFetch('/search?query=Cinta&limit=20&offset=0');

        const [resLatest, resTrending, resCEO, resLove] = await Promise.all([pLatest, pTrending, pSearchCEO, pSearchLove]);

        // Fungsi Helper buat ambil list buku dari berbagai struktur JSON
        const extract = (res, isSearch = false) => {
            if (!res) return [];
            if (isSearch) {
                // Struktur Search Endpoint
                let list = [];
                if (res.data && res.data.search_data) {
                    res.data.search_data.forEach(g => {
                        if (g.books) list.push(...g.books.map(Melolo.mapBook));
                    });
                }
                return list;
            } else {
                // Struktur Home Endpoint
                if (res.books) return res.books.map(Melolo.mapBook);
                if (res.data && res.data.books) return res.data.books.map(Melolo.mapBook);
                return [];
            }
        };

        // C. OPLOS DATA
        // Latest = Data Asli Latest + Search "Cinta"
        const listLatest = [...extract(resLatest), ...extract(resLove, true)];
        
        // Trending = Data Asli Trending + Search "CEO"
        const listTrending = [...extract(resTrending), ...extract(resCEO, true)];

        return {
            latest: Melolo.removeDuplicates(listLatest),
            trending: Melolo.removeDuplicates(listTrending)
        };
    },

    // --- 2. SEARCH ---
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

    // --- 3. DETAIL ---
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
                vid: ep.vid, // ID Video untuk stream
                cover: ep.episode_cover || ep.cover,
                duration: ep.duration,
                url: null
            }))
        };
    },

    // --- 4. STREAM (AUTO HTTPS) ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        if (!res || !res.data) return null;

        let streamUrl = res.data.main_url || res.data.backup_url;
        
        // AUTO FIX: Ubah http:// jadi https:// biar jalan di Vercel
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
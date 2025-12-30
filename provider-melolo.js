const Melolo = {
    // API via Vercel (Aman)
    apiBase: '/api/melolo',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${Melolo.apiBase}${endpoint}`);
            if (!res.ok) throw new Error("Fetch Error");
            return await res.json();
        } catch (e) {
            console.error(`[Melolo] Error ${endpoint}:`, e);
            return null;
        }
    },

    // --- 1. HOME (LANGSUNG MINTA BANYAK) ---
    fetchHome: async () => {
        // Kita paksa server kirim 50 item (limit=50)
        // Tanpa trik search, murni dari endpoint asli
        const [latestRes, trendingRes] = await Promise.all([
            Melolo.smartFetch('/latest?limit=50&offset=0'),
            Melolo.smartFetch('/trending?limit=50&offset=0')
        ]);

        // Cek data dengan teliti (kadang struktur JSON bisa berubah)
        let latestList = [];
        if (latestRes) {
            if (latestRes.books) latestList = latestRes.books;
            else if (latestRes.data && latestRes.data.books) latestList = latestRes.data.books;
        }

        let trendingList = [];
        if (trendingRes) {
            if (trendingRes.books) trendingList = trendingRes.books;
            else if (trendingRes.data && trendingRes.data.books) trendingList = trendingRes.data.books;
        }

        return {
            latest: latestList.map(Melolo.mapBook),
            trending: trendingList.map(Melolo.mapBook)
        };
    },

    // --- 2. SEARCH ---
    search: async (keyword) => {
        // Search juga kita limit 50 biar puas
        const res = await Melolo.smartFetch(`/search?query=${encodeURIComponent(keyword)}&limit=50&offset=0`);
        let results = [];
        if (res && res.data && res.data.search_data) {
            res.data.search_data.forEach(group => {
                if (group.books) results.push(...group.books.map(Melolo.mapBook));
            });
        }
        return results;
    },

    // --- 3. DETAIL DRAMA ---
    fetchDetail: async (bookId) => {
        const res = await Melolo.smartFetch(`/detail?bookId=${bookId}`);
        if (!res || !res.data || !res.data.video_data) return null;

        const data = res.data.video_data;
        return {
            source: 'melolo',
            title: data.series_title,
            cover: data.series_cover,
            intro: data.series_intro,
            totalEps: data.episode_cnt,
            episodes: data.video_list.map(ep => ({
                index: ep.vid_index,
                name: `Ep ${ep.vid_index}`,
                vid: ep.vid,
                cover: ep.cover,
                duration: ep.duration,
                url: null 
            }))
        };
    },

    // --- 4. STREAM ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        if (!res || !res.data) return null;

        let streamUrl = res.data.main_url || res.data.backup_url;
        // Fix HTTPS
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
            score: b.serial_count ? b.serial_count + ' Eps' : 'N/A', 
            label: tag
        };
    }
};

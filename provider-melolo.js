const Melolo = {
    // API Utama
    apiBase: 'https://api.sansekai.my.id/api/melolo',
    // Proxy Cadangan (Dipakai kalau API Utama kena blokir CORS)
    proxyBase: 'https://corsproxy.io/?',

    // --- HELPER: FETCH PINTAR (Auto Switch Proxy) ---
    smartFetch: async (endpoint) => {
        const targetUrl = `${Melolo.apiBase}${endpoint}`;
        try {
            // 1. Coba Tembak Langsung
            const res = await fetch(targetUrl);
            if (!res.ok) throw new Error("Direct Fail");
            return await res.json();
        } catch (e) {
            console.warn(`[Melolo] Direct fail ke ${endpoint}, coba via Proxy...`);
            try {
                // 2. Kalau Gagal, Pakai Proxy
                const encodedUrl = encodeURIComponent(targetUrl);
                const resProxy = await fetch(`${Melolo.proxyBase}${encodedUrl}`);
                return await resProxy.json();
            } catch (errProxy) {
                console.error(`[Melolo] Gagal Total ke ${endpoint}`, errProxy);
                return null;
            }
        }
    },

    // --- 1. HOME (Latest + Trending) ---
    fetchHome: async () => {
        // Panggil pakai Smart Fetch
        const latestRes = await Melolo.smartFetch('/latest');
        const trendingRes = await Melolo.smartFetch('/trending');

        // Cek data sebelum diproses
        const latestList = (latestRes && latestRes.books) ? latestRes.books : [];
        const trendingList = (trendingRes && trendingRes.books) ? trendingRes.books : [];

        console.log(`[Melolo] Home Data - Latest: ${latestList.length}, Trending: ${trendingList.length}`);

        return {
            latest: latestList.map(Melolo.mapBook),
            trending: trendingList.map(Melolo.mapBook)
        };
    },

    // --- 2. SEARCH ---
    search: async (keyword) => {
        const res = await Melolo.smartFetch(`/search?query=${encodeURIComponent(keyword)}&limit=20&offset=0`);
        let results = [];
        if (res && res.data && res.data.search_data) {
            res.data.search_data.forEach(group => {
                if (group.books) {
                    results.push(...group.books.map(Melolo.mapBook));
                }
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

    // --- 4. GET STREAM URL ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        if (!res || !res.data) return null;
        return res.data.main_url || res.data.backup_url;
    },

    // Helper: Mapping Data
    mapBook: (b) => {
        let tag = 'Drama';
        if (b.stat_infos && b.stat_infos.length > 0) {
            tag = b.stat_infos[0].split(',')[0]; 
        }
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

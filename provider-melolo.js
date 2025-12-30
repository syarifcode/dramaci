const Melolo = {
    apiBase: 'https://api.sansekai.my.id/api/melolo',

    // --- FETCH CEPAT (SATU JALUR: Corsproxy.io) ---
    // Strategi sama persis dengan Dramabox & Netshort biar stabil & cepat
    smartFetch: async (endpoint) => {
        const targetUrl = `${Melolo.apiBase}${endpoint}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Gagal Fetch via Proxy");
            return await res.json();
        } catch (e) {
            console.error(`[Melolo] Error ke ${endpoint}:`, e);
            return null;
        }
    },

    // --- 1. HOME (Parallel Fetch) ---
    fetchHome: async () => {
        // Ambil Latest & Trending barengan biar loading makin ngebut
        const [latestRes, trendingRes] = await Promise.all([
            Melolo.smartFetch('/latest'),
            Melolo.smartFetch('/trending')
        ]);

        return {
            latest: (latestRes && latestRes.books) ? latestRes.books.map(Melolo.mapBook) : [],
            trending: (trendingRes && trendingRes.books) ? trendingRes.books.map(Melolo.mapBook) : []
        };
    },

    // --- 2. SEARCH ---
    search: async (keyword) => {
        const res = await Melolo.smartFetch(`/search?query=${encodeURIComponent(keyword)}&limit=20&offset=0`);
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

    // --- 4. STREAM (AUTO FIX HTTP -> HTTPS) ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        if (!res || !res.data) return null;

        // Ambil URL (Prioritas Main, kalau kosong pakai Backup)
        let streamUrl = res.data.main_url || res.data.backup_url;

        // FIX PENTING: JSON Melolo kasih link 'http', kita harus ubah ke 'https'
        // Kalau tidak, browser modern (Chrome/Vercel) akan memblokir (Mixed Content)
        if (streamUrl && streamUrl.startsWith('http://')) {
            streamUrl = streamUrl.replace('http://', 'https://');
        }

        return streamUrl;
    },

    // Helper Mapping Data
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

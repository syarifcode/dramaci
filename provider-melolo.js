const Melolo = {
    // KITA TEMBAK PATH LOKAL (Nanti dibelokkan sama vercel.json ke server asli)
    apiBase: '/api/melolo',

    // Fetch Super Simpel & Cepat
    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${Melolo.apiBase}${endpoint}`);
            if (!res.ok) throw new Error("Gagal Fetch");
            return await res.json();
        } catch (e) {
            console.error(`[Melolo] Error ${endpoint}:`, e);
            return null;
        }
    },

    // --- 1. HOME ---
    fetchHome: async () => {
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

    // --- 4. STREAM ---
    fetchStream: async (vid) => {
        const res = await Melolo.smartFetch(`/stream?videoId=${vid}`);
        if (!res || !res.data) return null;

        let streamUrl = res.data.main_url || res.data.backup_url;

        // Auto Fix HTTPS (Biar video jalan di Vercel)
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

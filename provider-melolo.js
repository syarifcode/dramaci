const Melolo = {
    apiBase: 'https://api.sansekai.my.id/api/melolo',

    // --- FETCH MURNI (4 LAPIS JALUR TIKUS) ---
    // Kita coba segala cara untuk menembus blokir tanpa memalsukan data.
    smartFetch: async (endpoint) => {
        const targetUrl = `${Melolo.apiBase}${endpoint}`;

        // JALUR 1: Tembak Langsung (Ideal)
        try {
            const res = await fetch(targetUrl);
            if (res.ok) return await res.json();
        } catch (e) { console.warn(`[Melolo] Direct Gagal, coba jalur 2...`); }

        // JALUR 2: Corsproxy.io (Proxy Cepat)
        try {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
            if (res.ok) return await res.json();
        } catch (e) { console.warn(`[Melolo] Proxy A Gagal, coba jalur 3...`); }

        // JALUR 3: AllOrigins (Proxy Stabil)
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
            const data = await res.json();
            if (data.contents) return JSON.parse(data.contents);
        } catch (e) { console.warn(`[Melolo] Proxy B Gagal, coba jalur 4...`); }

        // JALUR 4: Thingproxy (Cadangan Terakhir)
        try {
            const res = await fetch(`https://thingproxy.freeboard.io/fetch/${targetUrl}`);
            if (res.ok) return await res.json();
        } catch (e) { console.error(`[Melolo] Semua Jalur Buntu.`); }

        // Kalau semua gagal, kita MENYERAH (Return NULL). 
        // Tidak ada data palsu di sini.
        return null;
    },

    // --- 1. HOME ---
    fetchHome: async () => {
        const latestRes = await Melolo.smartFetch('/latest');
        const trendingRes = await Melolo.smartFetch('/trending');

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
        
        // Pengecekan ketat: Data harus lengkap & asli
        if (!res || !res.data || !res.data.video_data) {
            console.error("[Melolo] Gagal ambil detail asli.");
            return null; // Akan memicu alert "Gagal memuat" di Core.js
        }

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
        
        if (res && res.data) {
            let streamUrl = res.data.main_url || res.data.backup_url;
            // FIX PENTING: Ubah http jadi https biar video mau jalan di Vercel/Chrome
            if (streamUrl && streamUrl.startsWith('http://')) {
                streamUrl = streamUrl.replace('http://', 'https://');
            }
            return streamUrl;
        }
        return null;
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

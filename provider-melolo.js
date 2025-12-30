const Melolo = {
    // Config API
    apiBase: 'https://api.sansekai.my.id/api/melolo',
    
    // --- FETCH PINTAR (3 LAPIS PERTAHANAN) ---
    smartFetch: async (endpoint) => {
        const targetUrl = `${Melolo.apiBase}${endpoint}`;
        
        // LAPIS 1: Direct Hit
        try {
            const res = await fetch(targetUrl);
            if (res.ok) return await res.json();
        } catch (e) { console.warn(`[Melolo] Direct Fail: ${endpoint}`); }

        // LAPIS 2: Proxy A (Corsproxy.io)
        try {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
            if (res.ok) return await res.json();
        } catch (e) { console.warn(`[Melolo] Proxy A Fail: ${endpoint}`); }

        // LAPIS 3: Proxy B (Allorigins)
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
            const data = await res.json();
            if (data.contents) return JSON.parse(data.contents);
        } catch (e) { console.error(`[Melolo] All Fetch Failed: ${endpoint}`); }

        return null; // Nyerah
    },

    // --- 1. HOME (ADA DATA CADANGAN) ---
    fetchHome: async () => {
        let latestData = [];
        let trendingData = [];

        // Coba Ambil Data Asli
        const latestRes = await Melolo.smartFetch('/latest');
        const trendingRes = await Melolo.smartFetch('/trending');

        if (latestRes && latestRes.books) latestData = latestRes.books;
        if (trendingRes && trendingRes.books) trendingData = trendingRes.books;

        // --- PERTAHANAN TERAKHIR: DATA CADANGAN (HARDCODED) ---
        // Kalau data kosong (kena blokir/limit), kita pakai data statis ini biar UI tetap muncul.
        if (latestData.length === 0) {
            console.log("[Melolo] Menggunakan Data Cadangan (Latest)");
            latestData = [
                {
                    book_id: "7588062478114753541",
                    book_name: "Dari Orang Biasa Jadi Juragan",
                    thumb_url: "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/187e5ff21cb5f38ab8c816f4c9148355~tplv-836v1mcgsk-image-quality-resize:240:342.heic?rk3s=95ec04ee&x-expires=1768781652&x-signature=A9VAlArKZG1dKyX7i5tWHH7QhTs%3D",
                    serial_count: "80",
                    stat_infos: ["Bukan siapa-siapa"]
                },
                {
                    book_id: "7582900611222342661",
                    book_name": "Istrimu Ternyata Sultan",
                    thumb_url: "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/4e17555f12243bb93f5c9687363afd1c~tplv-836v1mcgsk-image-quality-resize:240:342.heic?rk3s=95ec04ee&x-expires=1768781653&x-signature=dIShj1Q0ILF%2BY2MXx288TyXu4jk%3D",
                    serial_count: "86",
                    stat_infos: ["CEO"]
                },
                {
                    book_id: "7583238952534936629",
                    book_name": "Dikhianati Lalu Nikahi Bos Tajir",
                    thumb_url: "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/2572af502aeb29c5f0eff10dc22ff692~tplv-836v1mcgsk-image-quality-resize:240:342.heic?rk3s=95ec04ee&x-expires=1768781652&x-signature=%2Burz9nJlZO0bdLzbfV008D0giU0%3D",
                    serial_count: "82",
                    stat_infos: ["Romantis"]
                }
            ];
        }

        if (trendingData.length === 0) {
            console.log("[Melolo] Menggunakan Data Cadangan (Trending)");
            trendingData = [
                {
                    book_id: "7582055834209750069",
                    book_name": "Jenderal Terakhir",
                    thumb_url: "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/6b8f0a19c48d85b08cd39b7086ad0914~tplv-836v1mcgsk-image-quality-resize:240:342.heic?rk3s=95ec04ee&x-expires=1768781653&x-signature=DEFuKcrXOlEDs%2FmSw2sk7iNDoec%3D",
                    serial_count: "72",
                    stat_infos: ["Action"]
                },
                {
                    book_id: "7582204628406651909",
                    book_name": "Sang Mantan Dewa Judi",
                    thumb_url: "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/369dc6ed477944d5c24c9deedc088fba~tplv-836v1mcgsk-image-quality-resize:240:342.heic?rk3s=95ec04ee&x-expires=1768781653&x-signature=9wEZExNtPOZEhWPxe%2BGwWaY0IU0%3D",
                    serial_count: "80",
                    stat_infos: ["Drama"]
                }
            ];
        }

        return {
            latest: latestData.map(Melolo.mapBook),
            trending: trendingData.map(Melolo.mapBook)
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

const Melolo = {
    apiBase: 'https://api.sansekai.my.id/api/melolo',

    // --- 1. HOME (Latest + Trending) ---
    fetchHome: async () => {
        try {
            // Kita panggil 2 endpoint sekaligus biar cepat (Parallel)
            const [latestRes, trendingRes] = await Promise.all([
                fetch(`${Melolo.apiBase}/latest`).then(r => r.json()),
                fetch(`${Melolo.apiBase}/trending`).then(r => r.json())
            ]);

            return {
                latest: (latestRes.books || []).map(Melolo.mapBook),
                trending: (trendingRes.books || []).map(Melolo.mapBook)
            };
        } catch (e) {
            console.error("Melolo Home Error:", e);
            return { latest: [], trending: [] };
        }
    },

    // --- 2. SEARCH ---
    search: async (keyword) => {
        try {
            const url = `${Melolo.apiBase}/search?query=${encodeURIComponent(keyword)}&limit=20&offset=0`;
            const res = await fetch(url).then(r => r.json());
            
            let results = [];
            // Melolo search strukturnya agak dalam (nested)
            if (res.data && res.data.search_data) {
                res.data.search_data.forEach(group => {
                    if (group.books) {
                        results.push(...group.books.map(Melolo.mapBook));
                    }
                });
            }
            return results;
        } catch (e) {
            console.error("Melolo Search Error:", e);
            return [];
        }
    },

    // --- 3. DETAIL DRAMA ---
    fetchDetail: async (bookId) => {
        try {
            const res = await fetch(`${Melolo.apiBase}/detail?bookId=${bookId}`).then(r => r.json());
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
                    vid: ep.vid, // PENTING: Ini kunci buat ambil video nanti
                    cover: ep.cover,
                    duration: ep.duration,
                    url: null // URL kita kosongkan dulu, ambil nanti pas play (JIT)
                }))
            };
        } catch (e) {
            console.error("Melolo Detail Error:", e);
            return null;
        }
    },

    // --- 4. GET STREAM URL (PENTING!) ---
    fetchStream: async (vid) => {
        try {
            const res = await fetch(`${Melolo.apiBase}/stream?videoId=${vid}`).then(r => r.json());
            // Prioritas ambil main_url
            return res.data.main_url || res.data.backup_url;
        } catch (e) {
            console.error("Melolo Stream Error:", e);
            return null;
        }
    },

    // Helper: Merapikan data mentah jadi format kartu standar Dramaci
    mapBook: (b) => {
        let tag = 'Drama';
        if (b.stat_infos && b.stat_infos.length > 0) {
            // Ambil tag pertama sebelum koma
            tag = b.stat_infos[0].split(',')[0]; 
        }
        return {
            source: 'melolo',
            id: b.book_id,
            title: b.book_name,
            cover: b.thumb_url,
            score: b.serial_count + ' Eps', // Kita pakai slot score buat nampilin jumlah eps
            label: tag
        };
    }
};

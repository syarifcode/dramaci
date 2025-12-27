// --- PROVIDER 2: NETSHORT (NS) ---
const Netshort = {
    // Base URL Proxy (sesuai vercel.json)
    BASE: '/api/ns',

    // Helper: Bersihkan tag HTML <em> dari judul
    cleanTitle: (rawTitle) => {
        return rawTitle.replace(/<\/?em>/g, '').trim();
    },

    // 1. Home Groups (Viral, Dubbing, Ranking)
    fetchTheaters: async () => {
        try {
            const res = await fetch(`${Netshort.BASE}/theaters`);
            const json = await res.json();
            
            // Kita ambil grup Viral sebagai contoh
            const viralGroup = json.find(g => g.contentName.includes("Viral"));
            
            let result = { viral: [] };

            if(viralGroup) {
                result.viral = viralGroup.contentInfos.map(item => ({
                    source: 'ns', // Penanda Sumber
                    id: item.shortPlayId,
                    title: Netshort.cleanTitle(item.shortPlayName),
                    cover: item.shortPlayCover,
                    label: item.scriptName || 'Viral',
                    score: item.heatScoreShow // "207.9K"
                }));
            }
            return result;
        } catch(e) { console.error("NS Home Error", e); return { viral: [] }; }
    },

    // 2. Explore / Foryou (Infinite Scroll)
    fetchExplore: async (page = 1) => {
        try {
            const res = await fetch(`${Netshort.BASE}/foryou?page=${page}`);
            const json = await res.json();
            const rawList = json.contentInfos || [];

            return rawList.map(item => ({
                source: 'ns',
                id: item.shortPlayId,
                title: Netshort.cleanTitle(item.shortPlayName),
                cover: item.shortPlayCover,
                label: item.scriptName || '',
                score: item.heatScoreShow
            }));
        } catch(e) { return []; }
    },

    // 3. Search
    search: async (keyword) => {
        try {
            const res = await fetch(`${Netshort.BASE}/search?query=${encodeURIComponent(keyword)}`);
            const json = await res.json();
            const rawList = json.searchCodeSearchResult || [];

            return rawList.map(item => ({
                source: 'ns',
                id: item.shortPlayId,
                title: Netshort.cleanTitle(item.shortPlayName),
                cover: item.shortPlayCover,
                label: 'Netshort',
                score: item.formatHeatScore
            }));
        } catch(e) { return []; }
    },

    // 4. Detail & Video (UPDATE: Ambil Subtitle)
    fetchDetail: async (shortPlayId) => {
        try {
            const res = await fetch(`${Netshort.BASE}/allepisode?shortPlayId=${shortPlayId}`);
            const json = await res.json();
            
            // Data utama ada di root JSON
            const d = json; 
            
            // Mapping Episode + SUBTITLE
            const episodes = (d.shortPlayEpisodeInfos || []).map(ep => ({
                name: `EP ${ep.episodeNo}`,
                url: ep.playVoucher, // Link MP4
                // Ambil subtitle jika ada
                subtitles: (ep.subtitleList || []).map(sub => ({
                    url: sub.url,
                    lang: sub.subtitleLanguage, // Contoh: "id_ID"
                    format: sub.format // "webvtt"
                }))
            }));

            return {
                title: Netshort.cleanTitle(d.shortPlayName),
                intro: d.shotIntroduce || "Tidak ada sinopsis.",
                cover: d.shortPlayCover,
                totalEps: d.totalEpisode,
                episodes: episodes,
                cast: [] 
            };

        } catch(e) { return null; }
    }
};

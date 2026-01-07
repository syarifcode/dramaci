const Netshort = {
    BASE: '/api/ns',

    cleanTitle: (rawTitle) => {
        return rawTitle.replace(/<\/?em>/g, '').trim();
    },

    // 1. Home Groups (MIXED: Viral + Premium + Ranking)
    fetchTheaters: async () => {
        try {
            const res = await fetch(`${Netshort.BASE}/theaters`);
            const json = await res.json();
            
            // A. DATA UNTUK SLIDER HOME (Viral, Premium, Ranking)
            // Filter grup yang BUKAN Dubbing dan BUKAN Segera Tayang
            const homeGroups = json.filter(g => 
                !g.contentName.includes("Dubbing") && 
                !g.contentName.includes("Segera")
            );

            // Gabung jadi satu list besar
            let viralList = [];
            homeGroups.forEach(group => {
                const items = group.contentInfos.map(item => ({
                    source: 'ns',
                    id: item.shortPlayId,
                    title: Netshort.cleanTitle(item.shortPlayName),
                    cover: item.shortPlayCover,
                    label: item.scriptName || 'Hot',
                    score: item.heatScoreShow
                }));
                viralList = [...viralList, ...items];
            });

            // B. DATA UNTUK TAB INDO (Khusus Dubbing)
            const dubGroup = json.find(g => g.contentName.includes("Dubbing"));
            let dubList = [];
            if(dubGroup) {
                dubList = dubGroup.contentInfos.map(item => ({
                    source: 'ns',
                    id: item.shortPlayId,
                    title: Netshort.cleanTitle(item.shortPlayName),
                    cover: item.shortPlayCover,
                    label: 'NS Indo',
                    score: item.heatScoreShow
                }));
            }

            // Kembalikan objek dengan 2 list
            return { viral: viralList, dubbing: dubList };

        } catch(e) { console.error("NS Home Error", e); return { viral: [], dubbing: [] }; }
    },

    // 2. Explore
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

    // 4. Detail & Video (Subtitle Support)
    fetchDetail: async (shortPlayId) => {
        try {
            const res = await fetch(`${Netshort.BASE}/allepisode?shortPlayId=${shortPlayId}`);
            const json = await res.json();
            const d = json; 
            
            const episodes = (d.shortPlayEpisodeInfos || []).map(ep => ({
                name: `EP ${ep.episodeNo}`,
                url: ep.playVoucher,
                // Ambil Subtitle
                subtitles: (ep.subtitleList || []).map(sub => ({
                    url: sub.url,
                    lang: sub.subtitleLanguage, 
                    format: sub.format
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

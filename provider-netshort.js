const Netshort = {
    // KEMBALI KE SETTINGAN AWAL V9 (Lancar Jaya)
    apiBase: 'https://corsproxy.io/?https://netshort.com/api',

    fetchTheaters: async () => {
        try {
            const res = await fetch(`${Netshort.apiBase}/home/theater`);
            if(!res.ok) throw new Error("Netshort Down");
            const data = await res.json();
            
            const mapFunc = (item) => ({
                source: 'ns',
                id: item.dramaId,
                title: item.title,
                cover: item.cover,
                score: 'Viral',
                label: 'Netshort'
            });

            return {
                viral: (data.data?.list || []).map(mapFunc),
                dubbing: (data.data?.column?.[0]?.list || []).map(mapFunc)
            };
        } catch (e) {
            console.error("Netshort Home Error:", e);
            return { viral: [], dubbing: [] };
        }
    },

    fetchExplore: async (page = 1) => {
        try {
            const res = await fetch(`${Netshort.apiBase}/search/list?page=${page}&size=20&type=recommend`);
            const data = await res.json();
            return (data.data?.list || []).map(item => ({
                source: 'ns',
                id: item.dramaId,
                title: item.title,
                cover: item.cover,
                score: 'Hot',
                label: 'Explore'
            }));
        } catch (e) { return []; }
    },

    search: async (keyword) => {
        try {
            const res = await fetch(`${Netshort.apiBase}/search/list?page=1&size=20&keywords=${encodeURIComponent(keyword)}`);
            const data = await res.json();
            return (data.data?.list || []).map(item => ({
                source: 'ns',
                id: item.dramaId,
                title: item.title,
                cover: item.cover,
                score: 'Cari',
                label: 'Netshort'
            }));
        } catch (e) { return []; }
    },

    fetchDetail: async (id) => {
        try {
            const res = await fetch(`${Netshort.apiBase}/episode/list?dramaId=${id}`);
            const data = await res.json();
            const info = data.data;
            
            return {
                source: 'ns',
                title: info.title || "Drama Netshort",
                cover: info.cover,
                intro: info.introduction || "Tidak ada sinopsis.",
                totalEps: info.episodeList.length,
                episodes: info.episodeList.map((ep, idx) => ({
                    index: idx + 1,
                    name: `Ep ${ep.episodeNo}`,
                    vid: ep.episodeId,
                    cover: ep.cover,
                    duration: 60,
                    url: ep.wmUrl || ep.url,
                    subtitles: ep.subtitles || []
                }))
            };
        } catch (e) { return null; }
    }
};

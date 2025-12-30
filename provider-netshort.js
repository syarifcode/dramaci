const Netshort = {
    // SEKARANG PAKAI JALUR VERCEL (Anti-Blokir & Stabil)
    apiBase: '/api/ns',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${Netshort.apiBase}${endpoint}`);
            if(!res.ok) throw new Error("Fetch Gagal");
            return await res.json();
        } catch (e) {
            console.error(`[NS] Error ${endpoint}:`, e);
            return null;
        }
    },

    fetchTheaters: async () => {
        const data = await Netshort.smartFetch('/home/theater');
        if (!data) return { viral: [], dubbing: [] };

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
    },

    fetchExplore: async (page = 1) => {
        const data = await Netshort.smartFetch(`/search/list?page=${page}&size=20&type=recommend`);
        if (!data) return [];
        return (data.data?.list || []).map(item => ({
            source: 'ns',
            id: item.dramaId,
            title: item.title,
            cover: item.cover,
            score: 'Hot',
            label: 'Explore'
        }));
    },

    search: async (keyword) => {
        const data = await Netshort.smartFetch(`/search/list?page=1&size=20&keywords=${encodeURIComponent(keyword)}`);
        if (!data) return [];
        return (data.data?.list || []).map(item => ({
            source: 'ns',
            id: item.dramaId,
            title: item.title,
            cover: item.cover,
            score: 'Cari',
            label: 'Netshort'
        }));
    },

    fetchDetail: async (id) => {
        const data = await Netshort.smartFetch(`/episode/list?dramaId=${id}`);
        if (!data || !data.data) return null;
        
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
    }
};

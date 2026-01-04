const DramaboxV2 = {
    apiBase: 'https://api.sansekai.my.id/api/dramabox',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${DramaboxV2.apiBase}${endpoint}`);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) { console.error(e); return null; }
    },

    // 1. HOME & TRENDING (Halaman 1)
    fetchTrending: async () => {
        const data = await DramaboxV2.smartFetch('/trending');
        return (data || []).map(DramaboxV2.mapBook);
    },

    // 2. LATEST (Buat Load More - Support Page)
    fetchLatest: async (page = 1) => {
        // Asumsi endpoint latest support paging, atau kita akali di Core
        const sep = '/latest'.includes('?') ? '&' : '?';
        const data = await DramaboxV2.smartFetch(`/latest${sep}page=${page}`);
        return (data || []).map(DramaboxV2.mapBook);
    },

    // 3. VIP PAGE
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if (!res || !res.columnVoList) return [];
        return res.columnVoList.map(col => ({
            title: col.title,
            list: (col.bookList || []).map(DramaboxV2.mapBook)
        }));
    },

    // 4. DUBBING INDO
    fetchDubbed: async (page = 1) => {
        const data = await DramaboxV2.smartFetch(`/dubindo?classify=terpopuler&page=${page}`);
        return (data || []).map(DramaboxV2.mapBook);
    },

    // 5. SEARCH
    search: async (query) => {
        const data = await DramaboxV2.smartFetch(`/search?query=${encodeURIComponent(query)}`);
        return (data || []).map(DramaboxV2.mapBook);
    },

    // 6. DETAIL & STREAM
    fetchDetail: async (bookId) => {
        const [detailRes, streamRes] = await Promise.all([
            DramaboxV2.smartFetch(`/detail?bookId=${bookId}`),
            DramaboxV2.smartFetch(`/allepisode?bookId=${bookId}`)
        ]);

        if (!detailRes || !detailRes.data || !detailRes.data.book) return null;

        const book = detailRes.data.book;
        const recommends = (detailRes.data.recommends || []).map(DramaboxV2.mapBook);
        
        let episodes = [];
        if (detailRes.data.chapterList) {
            episodes = detailRes.data.chapterList.map(ch => {
                let streamUrl = ch.mp4 || "";
                if (streamRes && Array.isArray(streamRes)) {
                    const match = streamRes.find(s => s.chapterId == ch.id);
                    if (match && match.cdnList) {
                        const cdn = match.cdnList.find(c => c.isDefault === 1) || match.cdnList[0];
                        if (cdn && cdn.videoPathList) {
                            const video = cdn.videoPathList.find(v => v.quality === 720) || cdn.videoPathList[0];
                            if (video) streamUrl = video.videoPath;
                        }
                    }
                }
                return {
                    index: ch.index,
                    name: `Ep ${ch.indexStr ? Number(ch.indexStr) : ch.index + 1}`,
                    vid: ch.id,
                    cover: ch.cover,
                    url: streamUrl,
                    isLocked: !ch.unlock
                };
            });
        }

        return {
            source: 'db',
            id: book.bookId,
            title: book.bookName,
            cover: book.cover,
            intro: book.introduction,
            totalEps: book.chapterCount,
            episodes: episodes,
            recommendations: recommends
        };
    },

    mapBook: (b) => {
        let image = b.coverWap || b.cover || "";
        if (!image.includes('resize')) image += "&image_process=resize,w_300";
        let score = "Baru";
        if (b.playCount) score = b.playCount;
        else if (b.viewCount) score = (b.viewCount / 1000000).toFixed(1) + "M";
        else if (b.rankVo && b.rankVo.hotCode) score = b.rankVo.hotCode;

        return {
            source: 'db',
            id: b.bookId,
            title: b.bookName,
            cover: image,
            poster: image,
            score: score,
            label: b.corner ? b.corner.name : (b.chapterCount ? b.chapterCount + " Eps" : "")
        };
    }
};
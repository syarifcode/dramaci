const DramaboxV2 = {
    apiBase: 'https://api.sansekai.my.id/api/dramabox',

    smartFetch: async (endpoint) => {
        try {
            const res = await fetch(`${DramaboxV2.apiBase}${endpoint}`);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) { console.error(e); return null; }
    },

    // 1. HOME & TRENDING
    fetchTrending: async () => {
        const res = await DramaboxV2.smartFetch('/trending');
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        return list.map(DramaboxV2.mapBook);
    },

    // 2. LATEST
    fetchLatest: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/latest?page=${page}`);
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        return list.map(DramaboxV2.mapBook);
    },

    // 3. VIP PAGE
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if (!res) return [];
        const rawList = res.columnVoList || (res.data && res.data.columnVoList) || [];
        return rawList.map(col => ({
            title: col.title,
            list: (col.bookList || []).map(DramaboxV2.mapBook)
        }));
    },

    // 4. DUBBING INDO
    fetchDubbed: async (page = 1) => {
        const res = await DramaboxV2.smartFetch(`/dubindo?classify=terpopuler&page=${page}`);
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        return list.map(DramaboxV2.mapBook);
    },

    // 5. SEARCH
    search: async (query) => {
        const res = await DramaboxV2.smartFetch(`/search?query=${encodeURIComponent(query)}`);
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        return list.map(DramaboxV2.mapBook);
    },

    // 6. DETAIL & STREAM (PERBAIKAN: LEBIH FLEKSIBEL)
    fetchDetail: async (bookId) => {
        try {
            const [detailRes, streamRes] = await Promise.all([
                DramaboxV2.smartFetch(`/detail?bookId=${bookId}`),
                DramaboxV2.smartFetch(`/allepisode?bookId=${bookId}`)
            ]);

            // A. CARI DATA BUKU (DETAIL)
            // Cek berbagai kemungkinan lokasi data detail
            let book = null;
            if (detailRes) {
                if (detailRes.bookId) book = detailRes; // Langsung ketemu
                else if (detailRes.data && detailRes.data.bookId) book = detailRes.data; // Ada di dalam .data
                else if (detailRes.data && detailRes.data.book) book = detailRes.data.book; // Ada di dalam .data.book (Old format)
            }

            if (!book) return null; // Jika tetap tidak ketemu, baru error

            // B. CARI DATA EPISODE (STREAM)
            // Cek berbagai kemungkinan lokasi list episode
            let rawChapters = [];
            if (streamRes) {
                if (streamRes.data && Array.isArray(streamRes.data.chapterList)) {
                    // Format Baru: { data: { chapterList: [...] } }
                    rawChapters = streamRes.data.chapterList;
                } else if (Array.isArray(streamRes)) {
                    // Format Langsung Array
                    rawChapters = streamRes;
                } else if (streamRes.chapterList && Array.isArray(streamRes.chapterList)) {
                    // Format Langsung Object
                    rawChapters = streamRes.chapterList;
                } else if (streamRes.data && Array.isArray(streamRes.data)) {
                    // Format data array
                    rawChapters = streamRes.data;
                }
            }

            // Mapping Episode
            const episodes = rawChapters.map((ch, idx) => {
                // Prioritas link video: .mp4 (baru) -> .url -> cari di cdnList (lama)
                let streamUrl = ch.mp4 || ch.url || "";
                
                // Fallback untuk format lama (CDN) jika mp4 kosong
                if (!streamUrl && ch.cdnList && ch.cdnList.length > 0) {
                   const cdn = ch.cdnList.find(c => c.isDefault === 1) || ch.cdnList[0];
                   if(cdn && cdn.videoPathList) {
                       const v = cdn.videoPathList.find(x => x.quality === 720) || cdn.videoPathList[0];
                       if(v) streamUrl = v.videoPath;
                   }
                }

                return {
                    index: ch.index !== undefined ? ch.index : idx,
                    name: `Ep ${idx + 1}`, // Pakai urutan array biar rapi
                    vid: ch.id,
                    cover: ch.cover || book.coverWap,
                    url: streamUrl,
                    isLocked: false // Selalu buka karena kita ambil direct link
                };
            });

            // Urutkan biar tidak acak
            episodes.sort((a, b) => a.index - b.index);

            return {
                source: 'db',
                id: book.bookId,
                title: book.bookName,
                cover: book.coverWap || book.cover,
                intro: book.introduction || "Sinopsis tidak tersedia.",
                totalEps: episodes.length,
                episodes: episodes,
                recommendations: []
            };

        } catch (e) {
            console.error("Detail Error:", e);
            return null;
        }
    },

    mapBook: (b) => {
        let image = b.coverWap || b.cover || "";
        if (image && !image.includes('resize')) image += "&image_process=resize,w_300";
        
        let score = "Baru";
        if (b.playCount) score = b.playCount;
        else if (b.hotCode) score = b.hotCode;
        else if (b.rankVo && b.rankVo.hotCode) score = b.rankVo.hotCode;

        let label = "";
        if (b.chapterCount) label = b.chapterCount + " Eps";
        else if (b.corner && b.corner.name) label = b.corner.name;

        return {
            source: 'db',
            id: b.bookId,
            title: b.bookName,
            cover: image,
            poster: image,
            score: score,
            label: label
        };
    }
};

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
        // Respon langsung Array
        const list = Array.isArray(res) ? res : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 2. LATEST
    fetchLatest: async (page = 1) => {
        // Respon langsung Array
        const res = await DramaboxV2.smartFetch(`/latest?page=${page}`);
        const list = Array.isArray(res) ? res : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 3. VIP PAGE
    fetchVIP: async () => {
        const res = await DramaboxV2.smartFetch('/vip');
        if (!res) return [];

        // Data ada di columnVoList
        const rawList = res.columnVoList || (res.data && res.data.columnVoList) || [];

        return rawList.map(col => ({
            title: col.title,
            list: (col.bookList || []).map(DramaboxV2.mapBook)
        }));
    },

    // 4. DUBBING INDO (Support Pagination)
    fetchDubbed: async (page = 1) => {
        // Respon langsung Array
        // Menambahkan parameter page sesuai request
        const res = await DramaboxV2.smartFetch(`/dubindo?classify=terpopuler&page=${page}`);
        const list = Array.isArray(res) ? res : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 5. SEARCH
    search: async (query) => {
        // Respon langsung Array
        const res = await DramaboxV2.smartFetch(`/search?query=${encodeURIComponent(query)}`);
        const list = Array.isArray(res) ? res : [];
        return list.map(DramaboxV2.mapBook);
    },

    // 6. DETAIL & STREAM (PERBAIKAN UTAMA)
    fetchDetail: async (bookId) => {
        try {
            // Ambil Detail & Episode secara paralel
            const [detailRes, streamRes] = await Promise.all([
                DramaboxV2.smartFetch(`/detail?bookId=${bookId}`),
                DramaboxV2.smartFetch(`/allepisode?bookId=${bookId}`)
            ]);

            // 1. Validasi Detail
            // Data detail sekarang langsung object { bookId: ... }
            // Tidak ada wrapper 'data' atau 'book' lagi.
            if (!detailRes || !detailRes.bookId) return null;
            const book = detailRes;

            // 2. Validasi & Mapping Episode
            // Data episode ada di streamRes.data.chapterList
            let episodes = [];
            let rawChapters = [];

            if (streamRes && streamRes.data && Array.isArray(streamRes.data.chapterList)) {
                rawChapters = streamRes.data.chapterList;
            }

            episodes = rawChapters.map(ch => {
                // Link video sekarang LANGSUNG ada di properti 'mp4'
                // Tidak perlu lagi cari cdnList/videoPathList yang rumit
                return {
                    index: ch.index || 0, // Fallback jika index kosong
                    name: ch.name || `Episode`,
                    vid: ch.id,
                    cover: ch.cover || book.coverWap,
                    url: ch.mp4 || "", // Link langsung MP4
                    isLocked: false // Anggap terbuka karena kita punya link MP4
                };
            });

            // Urutkan episode berdasarkan index (jaga-jaga acak)
            episodes.sort((a, b) => a.index - b.index);
            // Perbaiki penamaan episode jadi urut (Ep 1, Ep 2, dst)
            episodes = episodes.map((ep, i) => ({...ep, name: `Ep ${i + 1}`}));

            return {
                source: 'db',
                id: book.bookId,
                title: book.bookName,
                cover: book.coverWap || book.cover,
                intro: book.introduction || "Sinopsis tidak tersedia.",
                totalEps: episodes.length,
                episodes: episodes,
                recommendations: [] // Endpoint detail baru tidak membawa rekomendasi
            };

        } catch (e) {
            console.error("Detail Error:", e);
            return null;
        }
    },

    // Helper Mapping Data Kartu Depan
    mapBook: (b) => {
        // Handle variasi nama properti gambar
        let image = b.coverWap || b.cover || "";
        // Jika belum ada resize, tambahkan (opsional, server mungkin sudah handle)
        if (image && !image.includes('resize')) image += "&image_process=resize,w_300";
        
        // Handle skor/label
        let score = "Baru";
        if (b.playCount) score = b.playCount;
        else if (b.hotCode) score = b.hotCode; // Dari search result
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

// --- PROVIDER 1: DRAMABOX (DB) ---
const Dramabox = {
    // 1. Home Data (Trending)
    fetchHome: async (page = 1, size = 50) => {
        try {
            const res = await fetch(`/api/home?page=${page}&size=${size}`);
            const json = await res.json();
            const list = (json.data && json.data.book) ? json.data.book : [];
            
            // Cuci Data
            return list.map(item => ({
                source: 'db', // Penanda Sumber
                id: item.bookId || item.id, // ID Asli
                title: item.bookName || item.name,
                cover: item.coverWap || item.cover,
                label: (item.corner && item.corner.name) ? item.corner.name : '',
                score: '' // Dramabox jarang kasih view count di list
            }));
        } catch (e) { console.error("DB Home Error", e); return []; }
    },

    // 2. Dubbing Data
    fetchDubbed: async (page = 1, size = 50) => {
        try {
            const res = await fetch(`/api/dubbed?page=${page}&size=${size}`);
            const json = await res.json();
            let list = [];
            if(json.data && json.data.data && json.data.data.classifyBookList) {
                list = json.data.data.classifyBookList.records || [];
            }
            return list.map(item => ({
                source: 'db',
                id: item.bookId,
                title: item.bookName,
                cover: item.coverWap || item.cover,
                label: 'Bhs Indo'
            }));
        } catch (e) { return []; }
    },

    // 3. Search Data
    search: async (keyword) => {
        try {
            const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&page=1`);
            const json = await res.json();
            const list = (json.data && json.data.book) ? json.data.book : [];
            return list.map(item => ({
                source: 'db',
                id: item.id,
                title: item.name,
                cover: item.cover,
                label: item.tags ? item.tags[0] : ''
            }));
        } catch (e) { return []; }
    },

    // 4. Detail & Video (Cara Lama)
    fetchDetail: async (bookId) => {
        try {
            const res = await fetch(`/api/detail/${bookId}/v2`);
            const json = await res.json();
            if(!json.success) return null;
            
            const d = json.data.drama;
            
            // Ambil Episode (Coba jalur download dulu, fallback ke API chapters)
            let episodes = [];
            try {
                const resDl = await fetch(`/download/${bookId}`);
                const jsonDl = await resDl.json();
                if (jsonDl.status === 'success') {
                    episodes = jsonDl.data.map(ep => ({
                        name: ep.chapterName,
                        url: ep.videoPath
                    }));
                } else throw new Error();
            } catch (e) {
                try {
                    const resCh = await fetch(`/api/chapters/${bookId}`);
                    const jsonCh = await resCh.json();
                    if (jsonCh.success) {
                        episodes = jsonCh.data.map(ep => ({
                            name: `EP ${ep.chapterIndex+1}`,
                            url: ep.videoPath
                        }));
                    }
                } catch(err2){}
            }

            return {
                title: d.bookName,
                intro: d.introduction,
                cover: d.cover,
                totalEps: d.chapterCount,
                episodes: episodes,
                cast: d.performerList || []
            };

        } catch (e) { return null; }
    },
    
    // 5. VIP Data
    fetchVIP: async () => {
        try {
            const res = await fetch('/api/vip');
            const json = await res.json();
            // Parsing struktur VIP yg agak ribet
            let columns = [];
            if (json.data && json.data.data && json.data.data.columnVoList) columns = json.data.data.columnVoList;
            else if (json.data && json.data.columnVoList) columns = json.data.columnVoList;

            // Kembalikan raw columns, nanti Core yang render section-nya
            return columns.map(col => ({
                title: col.title,
                list: col.bookList.map(item => ({
                    source: 'db',
                    id: item.bookId || item.id,
                    title: item.bookName || item.name,
                    cover: item.coverWap || item.cover,
                    label: 'VIP'
                }))
            }));
        } catch(e) { return []; }
    }
};

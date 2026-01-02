const Flick = {
  apiBase: '/api/flick',
  
  smartFetch: async (endpoint) => {
    try {
      // Fix: Tambah parameter lang=in biar bahasa indo
      const sep = endpoint.includes('?') ? '&' : '?';
      const res = await fetch(`${Flick.apiBase}${endpoint}${sep}lang=in`);
      if (!res.ok) throw new Error("Fetch Error");
      return await res.json();
    } catch (e) { return null; }
  },
  
  // 1. HOME (Ambil Karusel & List)
  fetchHome: async () => {
    const res = await Flick.smartFetch('/home?page=1&p_size=20');
    if (!res || !res.data) return { slider: [], list: [] };
    
    let slider = [];
    let list = [];
    
    // Parsing Struktur Home Flickreels
    res.data.forEach(section => {
      // Ambil data slider (Biasanya title 'Karusel')
      if (section.style == 5 || section.title.includes("Karusel")) {
        slider = section.list.map(Flick.mapBook);
      }
      // Ambil data list (Drama Laris / Peringkat)
      else if (section.list && section.list.length > 0) {
        // Filter yang kosong
        const validItems = section.list.filter(x => x.playlet_id != 0).map(Flick.mapBook);
        list = [...list, ...validItems];
      }
    });
    
    return { slider, list: Flick.removeDuplicates(list) };
  },
  
  // 2. SEARCH
  search: async (keyword) => {
    const res = await Flick.smartFetch(`/search?q=${encodeURIComponent(keyword)}&page=1&p_size=20`);
    if (!res || !res.data) return [];
    return res.data.map(Flick.mapBook);
  },
  
  // 3. DETAIL & PLAYER (Gabung jadi satu karena endpoint Play isinya lengkap)
  fetchDetail: async (id) => {
    const res = await Flick.smartFetch(`/play?id=${id}`);
    if (!res || !res.data) return null;
    
    const d = res.data;
    const eps = (d.list || []).map(ep => ({
      index: ep.chapter_num,
      name: `Ep ${ep.chapter_num}`,
      vid: ep.chapter_id, // ID Chapter
      cover: ep.chapter_cover,
      url: ep.hls_url // Link M3U8 langsung
    }));
    
    return {
      source: 'flick',
      title: d.title,
      cover: d.cover,
      intro: d.introduce || "Sinopsis tidak tersedia.",
      totalEps: d.list.length, // Hitung manual dari array
      episodes: eps
    };
  },
  
  // Helper
  mapBook: (b) => ({
    source: 'flick',
    id: b.playlet_id,
    title: b.title,
    cover: b.cover,
    poster: b.background, // Gambar horizontal untuk slider
    score: b.upload_num + ' Eps',
    label: 'Flickreels' // Label Cyan
  }),
  
  removeDuplicates: (arr) => {
    const unique = [];
    const seen = new Set();
    for (const item of arr) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }
};
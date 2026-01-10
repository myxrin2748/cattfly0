// Konfigurasi API
const SHEETDB_URL = 'https://sheetdb.io/api/v1/6f6eekubj5k2n'; 

let allRows = [];
let filteredRows = [];
let currentPage = 1;
const itemsPerPage = 9;
let bookmarks = new Set(JSON.parse(localStorage.getItem('bookmarks') || '[]'));
let currentView = 'all';

// DOM Elements
const container = document.getElementById('link-container');
const mainLoader = document.getElementById('mainLoader');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const donationModal = document.getElementById('donation-modal');

// 1. Fetch Data
async function fetchLinks() {
    mainLoader.style.display = 'flex';
    try {
        const response = await fetch(SHEETDB_URL);
        if (!response.ok) throw new Error('Gagal memuat API');
        allRows = await response.json();
        
        populateCategories(allRows);
        applyFilters();
    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat data. Periksa API ID atau koneksi internet.</p>`;
    } finally {
        mainLoader.style.display = 'none';
    }
}

// 2. Render Kartu
function renderCards(rows) {
    container.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const pageRows = rows.slice(start, start + itemsPerPage);

    if (pageRows.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">Data tidak ditemukan.</p>`;
        return;
    }

    pageRows.forEach((r, idx) => {
        const index = start + idx;
        const idKey = r.Kode || r.Nama || r.url || index;
        const isFav = bookmarks.has(idKey);

        const card = document.createElement('div');
        card.className = 'link-card';

        // Thumbnail
        if (r.Thumbnail) {
            const img = document.createElement('img');
            img.src = r.Thumbnail;
            img.className = 'thumbnail';
            img.alt = r.Nama || 'thumbnail';
            card.appendChild(img);
        }

        // Code + Title
        const hdr = document.createElement('div');
        hdr.className = 'card-title';

        const codeSpan = document.createElement('span');
        codeSpan.className = 'item-code';
        codeSpan.textContent = r.Kode ? String(r.Kode) : '';
        hdr.appendChild(codeSpan);

        const title = document.createElement('span');
        title.className = 'item-name';
        title.textContent = r.Nama || 'Tanpa Nama';
        hdr.appendChild(title);

        card.appendChild(hdr);

        // (three-dot menu removed per request)

        // Buttons group (visible actions) — explicit copy buttons to avoid ambiguity
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';

        if (r.Link5MB) {
            const a = document.createElement('a');
            a.href = r.Link5MB;
            a.target = '_blank';
            a.className = 'btn btn-5mb';
            a.textContent = '5MB';
            btnGroup.appendChild(a);
            // copy icon next to 5MB link
            const copy5Icon = document.createElement('button');
            copy5Icon.type = 'button';
            copy5Icon.className = 'icon-copy';
            copy5Icon.title = 'Salin link 5MB';
            const c5img = document.createElement('img');
            c5img.src = 'assets/link.svg';
            c5img.alt = 'copy';
            copy5Icon.appendChild(c5img);
            copy5Icon.addEventListener('click', () => copyToClipboard(r.Link5MB));
            btnGroup.appendChild(copy5Icon);
        }

        if (r.LinkDrive) {
            const a2 = document.createElement('a');
            a2.href = r.LinkDrive;
            a2.target = '_blank';
            a2.className = 'btn btn-xml';
            a2.textContent = 'XML';
            btnGroup.appendChild(a2);
            // copy icon next to XML link
            const copyXmlIcon = document.createElement('button');
            copyXmlIcon.type = 'button';
            copyXmlIcon.className = 'icon-copy';
            copyXmlIcon.title = 'Salin link XML';
            const cximg = document.createElement('img');
            cximg.src = 'assets/link.svg';
            cximg.alt = 'copy';
            copyXmlIcon.appendChild(cximg);
            copyXmlIcon.addEventListener('click', () => copyToClipboard(r.LinkDrive));
            btnGroup.appendChild(copyXmlIcon);
        }

        // 'Tonton' link (e.g., TikTok) — show if available
        if (r.LinkTikTok) {
            const tonton = document.createElement('a');
            tonton.href = r.LinkTikTok;
            tonton.target = '_blank';
            tonton.className = 'btn btn-tonton';
            tonton.textContent = 'Tonton';
            btnGroup.appendChild(tonton);
        }

        card.appendChild(btnGroup);

        // Favorite button (top-right)
        const favBtn = document.createElement('button');
        favBtn.className = 'bookmark-btn' + (isFav ? ' active' : '');
        favBtn.setAttribute('aria-label', isFav ? 'Hapus favorit' : 'Tambahkan favorit');
        favBtn.innerHTML = '<img src="assets/favorit.svg" alt="fav">';
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFav(idKey);
            favBtn.classList.toggle('active');
        });
        card.appendChild(favBtn);

        container.appendChild(card);
    });

    // No dropdowns present; nothing to close here.
}

// 3. Logic & Filter
function applyFilters() {
    const q = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    const sort = sortSelect.value;

    filteredRows = allRows.filter(r => {
        const matchesSearch = (r.Nama || '').toLowerCase().includes(q) || (r.Kode || '').toLowerCase().includes(q);
        const matchesCat = cat === "" || r.Kategori === cat;
        const matchesFav = currentView === 'all' || bookmarks.has(r.Kode || r.Nama);
        return matchesSearch && matchesCat && matchesFav;
    });

    if (sort === 'name') filteredRows.sort((a,b) => (a.Nama||'').localeCompare(b.Nama||''));
    
    currentPage = 1;
    renderCards(filteredRows);
}

function populateCategories(rows) {
    const cats = [...new Set(rows.map(r => r.Kategori).filter(Boolean))];
    categoryFilter.innerHTML = '<option value="">Semua</option>' + 
        cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function toggleFav(id) {
    if (bookmarks.has(id)) bookmarks.delete(id);
    else bookmarks.add(id);
    localStorage.setItem('bookmarks', JSON.stringify([...bookmarks]));
    applyFilters();
}

// Toast helper
function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => t.classList.remove('visible'), 2200);
    setTimeout(() => t.remove(), 2600);
}

// Copy helper (reintroduced as requested)
function copyToClipboard(text) {
    if (!text) return showToast('Tidak ada link');
    navigator.clipboard.writeText(text).then(() => showToast('Link disalin')).catch(() => showToast('Gagal menyalin'));
}

// 4. Modal & Theme
function setupModal() {
    if (!localStorage.getItem('donateDismissed')) {
        donationModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

document.getElementById('donateDismiss').onclick = () => {
    if (document.getElementById('dontShowDonation').checked) {
        localStorage.setItem('donateDismissed', 'true');
    }
    donationModal.style.display = 'none';
    document.body.classList.remove('modal-open');
};

// Theme toggle: flip icon and persist state
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.classList.add('toggled');
    } else {
        document.body.classList.remove('dark-mode');
        if (themeIcon) themeIcon.classList.remove('toggled');
    }
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
}

(function initTheme(){
    const t = localStorage.getItem('theme');
    applyTheme(t === 'dark');
})();

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        applyTheme(isDark);
    });
}

// Event Listeners
searchInput.oninput = applyFilters;
categoryFilter.onchange = applyFilters;
sortSelect.onchange = applyFilters;
document.getElementById('showAll').onclick = function() {
    currentView = 'all';
    this.classList.add('active');
    document.getElementById('showBookmarks').classList.remove('active');
    applyFilters();
};
document.getElementById('showBookmarks').onclick = function() {
    currentView = 'bookmarks';
    this.classList.add('active');
    document.getElementById('showAll').classList.remove('active');
    applyFilters();
};

// Start
fetchLinks();
setupModal();

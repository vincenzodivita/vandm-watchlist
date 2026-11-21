// V&M Watchlist - Disney+ e Netflix
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwSl1vLF1Kvhaj4TlFyyIcLkk7la73nNteGTr-F6vtw8PWCJdpEAnZWjIwKoFv3Np1ntQ/exec';
const TMDB_API_KEY = 'e52e82734d4a34d3494787371a7149ba';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const PROVIDER_IDS = { disney: 337, netflix: 8 };

let currentUser = null;
let allMovies = [];
let userLists = { vincenzo: [], millena: [] };
let seenMovies = { vincenzo: [], millena: [] };
let currentPage = 1;
let totalPages = 1;
let currentRegion = null;
let currentProvider = 'disney';
let currentMediaType = 'movie';
let isSearching = false;
let currentSearchQuery = '';
let currentModalMovie = null;
let syncWatchLink = '';
let searchTimeout = null;
let searchAbortController = null;
let toastTimeout = null;

// Sets to track in-flight actions
const pendingSyncKeys = new Set();

// Performance Caches
const apiCache = {
    catalog: new Map(),   // key: provider_mediaType_region_lang_page
    search: new Map(),    // key: query_provider_mediaType_region_lang_page
    providers: new Map(), // key: mediaType_id
    details: new Map()    // key: mediaType_id_lang
};

const translations = {
    vincenzo: {
        welcome: 'Ciao Vincenzo! 🇮🇹',
        logout: 'Esci',
        tabCatalog: 'Catalogo Disney+',
        tabNetflix: 'Catalogo Netflix',
        moviesLabel: 'Film',
        seriesLabel: 'Serie TV',
        providerNetflix: 'Netflix',
        providerDisney: 'Disney+',
        tabMyList: 'La Mia Lista',
        tabShared: 'Da Vedere Insieme ❤️',
        tabSeen: 'Già Visti ✓',
        searchPlaceholderDisney: 'Cerca su Disney+ Italia...',
        searchPlaceholderNetflix: 'Cerca su Netflix Italia...',
        loading: 'Caricamento catalogo...',
        noMovies: 'Nessun titolo trovato',
        addButton: '+ Aggiungi',
        addedButton: '✓ Nella mia lista',
        removeButton: 'Rimuovi',
        seenButton: 'Già visto',
        notSeenButton: 'Da vedere',
        partnerBadge: '❤️ Millena',
        sharedBadge: '💕 Insieme',
        seenBadge: '✓ Visto',
        sharedTitle: 'Film che volete vedere insieme 💕',
        seenTitle: 'Film che avete già visto insieme ✓',
        emptyMyList: 'La tua lista è vuota. Aggiungi film o serie dal catalogo!',
        emptyShared: 'Nessun film in comune ancora. Aggiungete i vostri preferiti! 💑',
        emptySeen: 'Non avete ancora visto nessun film insieme. Guardate qualcosa e segnate come visto! 🎬',
        errorLoad: 'Errore nel caricamento dei dati da Google Sheets',
        errorSave: 'Errore nel salvataggio su Google Sheets',
        errorRemove: 'Errore nella rimozione da Google Sheets',
        close: 'Chiudi',
        previous: 'Precedente',
        next: 'Successiva',
        page: 'Pagina',
        of: 'di',
        syncWatch: '🔗 Watch Together',
        editSync: '✏️',
        syncModalTitle: 'Modifica Link Sincronizzazione',
        syncModalDescription: 'Inserisci il link generato dall\'estensione di sincronizzazione (es. Teleparty, Syncwatch)',
        syncPlaceholder: 'https://...',
        save: '💾 Salva',
        cancel: 'Annulla',
        syncSaved: 'Link salvato con successo!',
        syncError: 'Errore nella sincronizzazione',
        noSyncLink: 'Nessun link di sincronizzazione configurato. Clicca sul pulsante ✏️ per aggiungerne uno.',
        noOverview: 'Nessuna descrizione disponibile.',
        noTitle: 'Titolo non disponibile',
        saving: 'Salvataggio...',
        syncingSheets: 'Sincronizzazione in corso...',
        syncedSheets: 'Sincronizzato con successo!'
    },
    millena: {
        welcome: 'Olá Millena! 🇧🇷',
        logout: 'Sair',
        tabCatalog: 'Catálogo Disney+',
        tabNetflix: 'Catálogo Netflix',
        moviesLabel: 'Filmes',
        seriesLabel: 'Séries',
        providerNetflix: 'Netflix',
        providerDisney: 'Disney+',
        tabMyList: 'Minha Lista',
        tabShared: 'Para Assistir Juntos ❤️',
        tabSeen: 'Já Assistidos ✓',
        searchPlaceholderDisney: 'Buscar no Disney+ Brasil...',
        searchPlaceholderNetflix: 'Buscar na Netflix Brasil...',
        loading: 'Carregando catálogo...',
        noMovies: 'Nenhum título encontrado',
        addButton: '+ Adicionar',
        addedButton: '✓ Na minha lista',
        removeButton: 'Remover',
        seenButton: 'Já assistido',
        notSeenButton: 'Para assistir',
        partnerBadge: '❤️ Vincenzo',
        sharedBadge: '💕 Juntos',
        seenBadge: '✓ Assistido',
        sharedTitle: 'Títulos que vocês querem assistir juntos 💕',
        seenTitle: 'Títulos que vocês já assistiram juntos ✓',
        emptyMyList: 'Sua lista está vazia. Adicione filmes ou séries do catálogo!',
        emptyShared: 'Nenhum título em comum ancora. Adicionem seus favoritos! 💑',
        emptySeen: 'Vocês ainda não assistiram nenhum título juntos. Assistam algo e marquem como visto! 🎬',
        errorLoad: 'Erro ao carregar dados do Google Sheets',
        errorSave: 'Erro ao salvar no Google Sheets',
        errorRemove: 'Erro ao remover do Google Sheets',
        close: 'Fechar',
        previous: 'Anterior',
        next: 'Próxima',
        page: 'Página',
        of: 'de',
        syncWatch: '🔗 Watch Together',
        editSync: '✏️',
        syncModalTitle: 'Editar Link de Sincronização',
        syncModalDescription: 'Insira o link gerado pela extensão de sincronização (ex. Teleparty, Syncwatch)',
        syncPlaceholder: 'https://...',
        save: '💾 Salvar',
        cancel: 'Cancelar',
        syncSaved: 'Link salvo com sucesso!',
        syncError: 'Erro ao sincronizar',
        noSyncLink: 'Nenhum link de sincronização configurado. Clique no botão ✏️ para adicionar um.',
        noOverview: 'Nenhuma descrição disponível.',
        noTitle: 'Título não disponível',
        saving: 'Salvando...',
        syncingSheets: 'Sincronizando com o Sheets...',
        syncedSheets: 'Sincronizado com sucesso!'
    }
};

function t(key) {
    return translations[currentUser]?.[key] || key;
}

function getCatalogGrid() {
    return document.getElementById('catalogGrid');
}

function getCatalogPagination() {
    return document.getElementById('catalogPagination');
}

function getMovieKey(item) {
    return `${item.id}|${item.mediaType || 'movie'}`;
}

// Toast Feedback System
function showToast(message, type = 'syncing', icon = '🔄', duration = 0) {
    const toast = document.getElementById('syncToast');
    const toastMsg = document.getElementById('syncToastMessage');
    const toastIcon = document.getElementById('syncToastIcon');
    if (!toast || !toastMsg) return;

    clearTimeout(toastTimeout);
    toastMsg.textContent = message;
    if (toastIcon) {
        toastIcon.textContent = icon;
        toastIcon.classList.toggle('spin-icon', type === 'syncing');
    }

    toast.className = `sync-toast active ${type}`;

    if (duration > 0) {
        toastTimeout = setTimeout(() => {
            toast.classList.remove('active');
        }, duration);
    }
}

function hideToast() {
    clearTimeout(toastTimeout);
    const toast = document.getElementById('syncToast');
    if (toast) toast.classList.remove('active');
}

function mapTmdbItem(item, mediaType, provider = currentProvider) {
    const title = mediaType === 'tv' ? item.name : item.title;
    const date = mediaType === 'tv' ? item.first_air_date : item.release_date;
    return {
        id: item.id,
        title: title || t('noTitle'),
        year: date ? new Date(date).getFullYear() : 'N/A',
        poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
        overview: item.overview || '',
        rating: item.vote_average || 0,
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
        provider,
        mediaType
    };
}

async function fetchWithTimeout(url, options = {}) {
    const { timeout = 12000, ...fetchOptions } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timer);
        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

async function fetchCatalog(provider, mediaType, page = 1) {
    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const cacheKey = `${provider}_${mediaType}_${regionCode}_${language}_${page}`;

    if (apiCache.catalog.has(cacheKey)) {
        return apiCache.catalog.get(cacheKey);
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language,
        page: String(page),
        sort_by: 'popularity.desc',
        with_watch_providers: String(PROVIDER_IDS[provider]),
        watch_region: regionCode,
        with_watch_monetization_types: 'flatrate'
    });
    const response = await fetchWithTimeout(`${TMDB_BASE_URL}/discover/${mediaType}?${params}`);
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
    const data = await response.json();
    const result = {
        movies: (data.results || []).map(item => mapTmdbItem(item, mediaType, provider)),
        totalPages: Math.min(data.total_pages || 1, 500)
    };
    apiCache.catalog.set(cacheKey, result);
    return result;
}

async function searchCatalog(query, provider, mediaType, page = 1) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return { movies: [], totalPages: 0 };
    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const cacheKey = `${cleanQuery.toLowerCase()}_${provider}_${mediaType}_${regionCode}_${language}_${page}`;

    if (apiCache.search.has(cacheKey)) {
        return apiCache.search.get(cacheKey);
    }

    if (searchAbortController) {
        searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    const signal = searchAbortController.signal;

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY, query: cleanQuery, language, page: String(page), include_adult: 'false'
    });
    const response = await fetch(`${TMDB_BASE_URL}/search/${mediaType}?${params}`, { signal });
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
    const data = await response.json();
    const candidates = (data.results || []).slice(0, 20);

    const filtered = await Promise.all(candidates.map(async item => {
        try {
            const providerKey = `${mediaType}_${item.id}`;
            let providerData = apiCache.providers.get(providerKey);
            if (!providerData) {
                const providerResponse = await fetch(
                    `${TMDB_BASE_URL}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`,
                    { signal }
                );
                providerData = await providerResponse.json();
                apiCache.providers.set(providerKey, providerData);
            }
            const regionalProviders = providerData.results?.[regionCode]?.flatrate || [];
            return regionalProviders.some(p => p.provider_id === PROVIDER_IDS[provider])
                ? mapTmdbItem(item, mediaType, provider) : null;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Provider check failed:', error);
            }
            return null;
        }
    }));

    const result = {
        movies: filtered.filter(Boolean),
        totalPages: filtered.some(Boolean) ? Math.min(data.total_pages || 1, 500) : 0
    };
    apiCache.search.set(cacheKey, result);
    return result;
}

// Local cache for Google Sheets data (Stale-While-Revalidate)
function loadCachedSheetsData() {
    try {
        const cached = localStorage.getItem('vandm_cached_data');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.userLists) userLists = parsed.userLists;
            if (parsed.seenMovies) seenMovies = parsed.seenMovies;
            if (parsed.syncWatchLink) {
                syncWatchLink = parsed.syncWatchLink;
                updateSyncButton();
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
}

function saveCachedSheetsData() {
    try {
        localStorage.setItem('vandm_cached_data', JSON.stringify({
            userLists,
            seenMovies,
            syncWatchLink
        }));
    } catch (e) {
        console.warn('Cache save error:', e);
    }
}

// Google Sheets
async function loadFromSheets() {
    try {
        const response = await fetchWithTimeout(`${SHEETS_API_URL}?action=getAll`, { timeout: 15000 });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Google Sheets error');
        userLists = { vincenzo: [], millena: [] };
        seenMovies = { vincenzo: [], millena: [] };
        (data.movies || []).forEach(row => {
            if (!['vincenzo', 'millena'].includes(row.user)) return;
            const item = {
                id: Number(row.movieId),
                title: row.title,
                year: row.year,
                poster: row.poster,
                provider: row.provider || 'disney',
                mediaType: row.mediaType || 'movie'
            };
            userLists[row.user].push(item);
            if (row.seen === true || row.seen === 'TRUE') seenMovies[row.user].push(item);
        });
        saveCachedSheetsData();
    } catch (error) {
        console.error('Error loading from Sheets:', error);
        if (!userLists.vincenzo.length && !userLists.millena.length) {
            showError(t('errorLoad'));
        }
    }
}

async function postToSheets(payload, errorMessage) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error(error);
        showError(errorMessage || t('errorSave'));
        return false;
    }
}

function addToSheets(user, item) {
    saveCachedSheetsData();
    return postToSheets({
        action: 'add', user, movieId: item.id, title: item.title,
        year: item.year, poster: item.poster,
        provider: item.provider || 'disney', mediaType: item.mediaType || 'movie'
    }, t('errorSave'));
}

function removeFromSheets(user, item) {
    saveCachedSheetsData();
    return postToSheets({
        action: 'remove', user, movieId: item.id,
        provider: item.provider || 'disney', mediaType: item.mediaType || 'movie'
    }, t('errorRemove'));
}

function markAsSeenInSheets(item, seen) {
    saveCachedSheetsData();
    return postToSheets({
        action: 'markSeen', movieId: item.id, seen,
        provider: item.provider || 'disney', mediaType: item.mediaType || 'movie'
    }, t('errorSave'));
}

function showError(message) {
    const target = document.getElementById('catalogTab');
    if (!target) return;
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = message;
    target.prepend(div);
    setTimeout(() => div.remove(), 5000);
}

function showSuccessMessage(message) {
    const target = document.getElementById('catalogTab');
    if (!target) return;
    const div = document.createElement('div');
    div.className = 'success-message';
    div.textContent = message;
    target.prepend(div);
    setTimeout(() => div.remove(), 3000);
}

// Background Sync with Sheets
async function syncWithSheets() {
    try {
        await Promise.allSettled([loadFromSheets(), loadSyncLink()]);
        saveCachedSheetsData();
        displayCatalog(allMovies);
        updateMyList();
        updateSharedList();
        updateSeenList();
    } catch (e) {
        console.warn('Background sync error:', e);
    }
}

// Login
async function login(user) {
    currentUser = user;
    currentRegion = user === 'vincenzo' ? 'italy' : 'brazil';
    try {
        localStorage.setItem('vandm_user', user);
    } catch (e) {
        console.warn('localStorage error:', e);
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    document.getElementById('welcomeText').textContent = t('welcome');
    document.body.classList.toggle('vincenzo-color', user === 'vincenzo');
    updateUILanguage();

    // 1. Mostra istantaneamente i dati dalla cache locale (0ms di attesa)
    loadCachedSheetsData();

    // 2. Avvia subito il rendering del catalogo TMDB
    switchCatalog('disney', document.getElementById('disneyCatalogBtn'));

    // 3. Sincronizza i dati freschi da Google Sheets in background senza bloccare la UI
    syncWithSheets();
}

function updateSearchPlaceholder() {
    const searchBox = document.getElementById('searchBox');
    if (!searchBox) return;
    searchBox.placeholder = currentProvider === 'netflix'
        ? t('searchPlaceholderNetflix')
        : t('searchPlaceholderDisney');
}

function updateUILanguage() {
    document.querySelector('.logout-btn').textContent = t('logout');
    document.getElementById('disneyCatalogBtn').textContent = t('tabCatalog');
    document.getElementById('netflixCatalogBtn').textContent = t('tabNetflix');
    document.getElementById('myListTabBtn').textContent = t('tabMyList');
    document.getElementById('sharedTabBtn').textContent = t('tabShared');
    document.getElementById('seenTabBtn').textContent = t('tabSeen');
    updateSearchPlaceholder();
    document.getElementById('sharedTitle').textContent = t('sharedTitle');
    document.getElementById('seenTitle').textContent = t('seenTitle');
    document.getElementById('movieTypeMovies').textContent = t('moviesLabel');
    document.getElementById('movieTypeTv').textContent = t('seriesLabel');
}

function logout() {
    try {
        localStorage.removeItem('vandm_user');
    } catch (e) {
        console.warn('localStorage error:', e);
    }
    currentUser = null;
    currentRegion = null;
    allMovies = [];
    currentPage = 1;
    totalPages = 1;
    isSearching = false;
    currentSearchQuery = '';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
    document.body.classList.remove('vincenzo-color');
    hideToast();
}

function switchCatalog(provider, button) {
    currentProvider = provider;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(panel => panel.style.display = 'none');
    button?.classList.add('active');
    document.getElementById('catalogTab').style.display = 'block';
    document.getElementById('mediaTypeControls').style.display = 'flex';
    document.getElementById('movieTypeMovies').classList.toggle('active', currentMediaType === 'movie');
    document.getElementById('movieTypeTv').classList.toggle('active', currentMediaType === 'tv');
    updateSearchPlaceholder();
    loadCatalog(1);
}

function setMediaType(mediaType, button) {
    currentMediaType = mediaType;
    document.querySelectorAll('.media-type-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    loadCatalog(1);
}

async function loadCatalog(page = 1) {
    currentPage = page;
    isSearching = false;
    currentSearchQuery = '';
    const searchBox = document.getElementById('searchBox');
    if (searchBox) searchBox.value = '';
    const grid = getCatalogGrid();
    const pagination = getCatalogPagination();

    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const cacheKey = `${currentProvider}_${currentMediaType}_${regionCode}_${language}_${page}`;

    // Se è già in cache, rendering istantaneo a 0ms!
    if (apiCache.catalog.has(cacheKey)) {
        const cached = apiCache.catalog.get(cacheKey);
        allMovies = cached.movies;
        totalPages = cached.totalPages;
        displayCatalog(allMovies);
        updatePagination();
        return;
    }

    if (grid) grid.innerHTML = `<div class="loading">${t('loading')}</div>`;
    if (pagination) pagination.innerHTML = '';
    try {
        const result = await fetchCatalog(currentProvider, currentMediaType, page);
        allMovies = result.movies;
        totalPages = result.totalPages;
        displayCatalog(allMovies);
        updatePagination();
    } catch (error) {
        console.error('Catalog load error:', error);
        if (grid) grid.innerHTML = `<div class="empty-state">${t('errorLoad')}</div>`;
        if (pagination) pagination.innerHTML = '';
    }
}

async function loadSearchResults(query, page = 1) {
    isSearching = true;
    currentSearchQuery = query;
    currentPage = page;
    const grid = getCatalogGrid();
    const pagination = getCatalogPagination();

    const cleanQuery = query.trim().toLowerCase();
    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const cacheKey = `${cleanQuery}_${currentProvider}_${currentMediaType}_${regionCode}_${language}_${page}`;

    // Se è già in cache, rendering istantaneo
    if (apiCache.search.has(cacheKey)) {
        const cached = apiCache.search.get(cacheKey);
        allMovies = cached.movies;
        totalPages = cached.totalPages;
        displayCatalog(allMovies);
        updatePagination();
        return;
    }

    if (grid) grid.innerHTML = `<div class="loading">${t('loading')}</div>`;
    if (pagination) pagination.innerHTML = '';
    try {
        const result = await searchCatalog(query, currentProvider, currentMediaType, page);
        allMovies = result.movies;
        totalPages = result.totalPages;
        displayCatalog(allMovies);
        updatePagination();
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Search error:', error);
        if (grid) grid.innerHTML = `<div class="empty-state">${t('noMovies')}</div>`;
        if (pagination) pagination.innerHTML = '';
    }
}

function updatePagination() {
    const pagination = getCatalogPagination();
    if (!pagination) return;
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    pagination.innerHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ ${t('previous')}</button>
        <span class="page-info">${t('page')} ${currentPage} ${t('of')} ${totalPages}</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>${t('next')} ▶</button>
    `;
}

async function changePage(page) {
    if (page < 1 || page > totalPages) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isSearching && currentSearchQuery) await loadSearchResults(currentSearchQuery, page);
    else await loadCatalog(page);
}

function renderMovieCard(item, options = {}) {
    const otherUser = currentUser === 'vincenzo' ? 'millena' : 'vincenzo';
    const key = getMovieKey(item);
    const inMyList = userLists[currentUser].some(m => getMovieKey(m) === key);
    const inPartnerList = userLists[otherUser].some(m => getMovieKey(m) === key);
    const isSeen = seenMovies[currentUser].some(m => getMovieKey(m) === key);
    const isPending = pendingSyncKeys.has(key);
    const mediaLabel = item.mediaType === 'tv' ? t('seriesLabel') : t('moviesLabel');
    const providerLabel = item.provider === 'netflix' ? 'Netflix' : 'Disney+';

    let actionBtn;
    if (isPending) {
        actionBtn = `<button class="add-btn syncing" disabled><span class="button-spinner"></span> ${t('saving')}</button>`;
    } else if (options.action) {
        actionBtn = options.action;
    } else {
        actionBtn = `<button class="add-btn ${inMyList ? 'added' : ''}" onclick="toggleMovie(${item.id}, '${item.mediaType}', '${item.provider}')">${inMyList ? t('addedButton') : t('addButton')}</button>`;
    }

    return `<div class="movie-card">
        ${options.showPartner && inPartnerList ? `<div class="partner-badge">${t('partnerBadge')}</div>` : ''}
        ${options.showSeen && isSeen ? `<div class="seen-badge">${t('seenBadge')}</div>` : ''}
        <img src="${item.poster || ''}" alt="${escapeHtml(item.title)}" class="movie-poster" onclick="openMovieModal(${item.id}, '${item.mediaType}', '${item.provider}')" onerror="this.style.visibility='hidden'">
        <div class="movie-title" onclick="openMovieModal(${item.id}, '${item.mediaType}', '${item.provider}')">${escapeHtml(item.title)}</div>
        <div class="movie-year">${item.year || 'N/A'} · ${providerLabel} · ${mediaLabel}</div>
        ${item.rating ? `<div class="movie-rating">⭐ ${Number(item.rating).toFixed(1)}</div>` : ''}
        ${actionBtn}
    </div>`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function displayCatalog(items) {
    const grid = getCatalogGrid();
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = `<div class="empty-state">${t('noMovies')}</div>`;
        const pagination = getCatalogPagination();
        if (pagination) pagination.innerHTML = '';
        return;
    }
    grid.innerHTML = items.map(item => renderMovieCard(item, { showPartner: true, showSeen: true })).join('');
}

async function toggleMovie(id, mediaType = currentMediaType, provider = currentProvider) {
    const key = getMovieKey({ id, mediaType });
    const item = allMovies.find(m => getMovieKey(m) === key)
        || userLists[currentUser].find(m => getMovieKey(m) === key)
        || userLists[currentUser === 'vincenzo' ? 'millena' : 'vincenzo'].find(m => getMovieKey(m) === key)
        || currentModalMovie;
    if (!item) return;

    pendingSyncKeys.add(key);
    const index = userLists[currentUser].findIndex(m => getMovieKey(m) === key);
    const isAdding = index === -1;
    let removedItem = null;

    if (isAdding) {
        userLists[currentUser].push(item);
    } else {
        [removedItem] = userLists[currentUser].splice(index, 1);
        seenMovies[currentUser] = seenMovies[currentUser].filter(m => getMovieKey(m) !== key);
    }

    // Feedback immediato sulla UI con bottone in stato "Salvataggio..."
    displayCatalog(allMovies);
    updateMyList();
    updateSharedList();
    updateSeenList();
    updateModalAddButton();
    showToast(t('syncingSheets'), 'syncing', '🔄', 0);

    try {
        const ok = isAdding
            ? await addToSheets(currentUser, item)
            : await removeFromSheets(currentUser, removedItem);

        if (ok) {
            showToast(t('syncedSheets'), 'success', '✓', 2200);
        } else {
            showToast(t('syncError'), 'error', '⚠️', 3500);
        }
    } catch (e) {
        console.error('Sync error:', e);
        showToast(t('syncError'), 'error', '⚠️', 3500);
    } finally {
        pendingSyncKeys.delete(key);
        displayCatalog(allMovies);
        updateMyList();
        updateSharedList();
        updateSeenList();
        updateModalAddButton();
    }
}

function updateMyList() {
    const target = document.getElementById('mylistContent');
    const items = userLists[currentUser];
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            showPartner: true,
            showSeen: true,
            action: `<button class="add-btn remove-btn" onclick="toggleMovie(${item.id}, '${item.mediaType}', '${item.provider}')">🗑️ ${t('removeButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${t('emptyMyList')}</div>`;
}

function getSharedItems() {
    return userLists.vincenzo.filter(item => {
        const key = getMovieKey(item);
        return userLists.millena.some(other => getMovieKey(other) === key)
            && !(seenMovies.vincenzo.some(m => getMovieKey(m) === key)
              && seenMovies.millena.some(m => getMovieKey(m) === key));
    });
}

function updateSharedList() {
    const target = document.getElementById('sharedContent');
    const items = getSharedItems();
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            action: `<button class="seen-btn" onclick="toggleSeen(${item.id}, true, '${item.mediaType}', '${item.provider}')">✓ ${t('seenButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${t('emptyShared')}</div>`;
}

function updateSeenList() {
    const target = document.getElementById('seenContent');
    const items = seenMovies.vincenzo.filter(item =>
        seenMovies.millena.some(other => getMovieKey(other) === getMovieKey(item)));
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            action: `<button class="add-btn not-seen-btn" onclick="toggleSeen(${item.id}, false, '${item.mediaType}', '${item.provider}')">↺ ${t('notSeenButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${t('emptySeen')}</div>`;
}

async function toggleSeen(id, seen, mediaType = 'movie', provider = 'disney') {
    const key = getMovieKey({ id, mediaType });
    const item = userLists.vincenzo.find(m => getMovieKey(m) === key)
        || userLists.millena.find(m => getMovieKey(m) === key);
    if (!item) return;

    pendingSyncKeys.add(key);
    for (const user of ['vincenzo', 'millena']) {
        seenMovies[user] = seen
            ? [...seenMovies[user].filter(m => getMovieKey(m) !== key), item]
            : seenMovies[user].filter(m => getMovieKey(m) !== key);
    }

    // Feedback immediato con spinner sul bottone e toast
    updateSharedList();
    updateSeenList();
    updateMyList();
    showToast(t('syncingSheets'), 'syncing', '🔄', 0);

    try {
        const ok = await markAsSeenInSheets(item, seen);
        if (ok) {
            showToast(t('syncedSheets'), 'success', '✓', 2200);
        } else {
            showToast(t('syncError'), 'error', '⚠️', 3500);
        }
    } catch (e) {
        console.error('Mark seen error:', e);
        showToast(t('syncError'), 'error', '⚠️', 3500);
    } finally {
        pendingSyncKeys.delete(key);
        updateSharedList();
        updateSeenList();
        updateMyList();
    }
}

function switchTab(tab, button) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(panel => panel.style.display = 'none');
    button?.classList.add('active');
    if (tab === 'mylist') {
        document.getElementById('mylistTab').style.display = 'block';
        updateMyList();
    } else if (tab === 'shared') {
        document.getElementById('sharedTab').style.display = 'block';
        updateSharedList();
    } else if (tab === 'seen') {
        document.getElementById('seenTab').style.display = 'block';
        updateSeenList();
    }
}

function handleSearch() {
    const query = document.getElementById('searchBox').value.trim();
    clearTimeout(searchTimeout);
    if (!query) {
        if (searchAbortController) searchAbortController.abort();
        loadCatalog(1);
        return;
    }
    searchTimeout = setTimeout(() => loadSearchResults(query, 1), 350);
}

// Movie details modal with cache
async function openMovieModal(id, mediaType = currentMediaType, provider = currentProvider) {
    try {
        const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
        const cacheKey = `${mediaType}_${id}_${language}`;
        let details = apiCache.details.get(cacheKey);

        if (!details) {
            const response = await fetchWithTimeout(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=${language}`);
            if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
            details = await response.json();
            apiCache.details.set(cacheKey, details);
        }

        const item = mapTmdbItem(details, mediaType, provider);
        currentModalMovie = item;
        document.getElementById('modalBackdrop').src = item.backdrop || item.poster;
        document.getElementById('modalTitle').textContent = item.title;
        document.getElementById('modalYear').textContent = `${item.year} · ${provider === 'netflix' ? 'Netflix' : 'Disney+'} · ${mediaType === 'tv' ? t('seriesLabel') : t('moviesLabel')}`;
        document.getElementById('modalRating').textContent = item.rating ? `⭐ ${Number(item.rating).toFixed(1)}` : '';
        document.getElementById('modalOverview').textContent = item.overview || t('noOverview');
        updateModalAddButton();
        document.getElementById('movieModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error loading details:', error);
    }
}

function updateModalAddButton() {
    if (!currentModalMovie) return;
    const key = getMovieKey(currentModalMovie);
    const button = document.getElementById('modalAddButton');
    if (!button) return;

    if (pendingSyncKeys.has(key)) {
        button.disabled = true;
        button.className = 'modal-button syncing';
        button.innerHTML = `<span class="button-spinner"></span> ${t('saving')}`;
        return;
    }

    button.disabled = false;
    const inList = userLists[currentUser].some(m => getMovieKey(m) === key);
    button.textContent = inList ? t('removeButton') : t('addButton');
    button.className = `modal-button ${inList ? 'secondary' : 'primary'}`;
}

function closeModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close')) return;
    document.getElementById('movieModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentModalMovie = null;
}

async function toggleMovieFromModal() {
    if (!currentModalMovie) return;
    await toggleMovie(currentModalMovie.id, currentModalMovie.mediaType, currentModalMovie.provider);
}

// Sync link
async function loadSyncLink() {
    try {
        const response = await fetchWithTimeout(`${SHEETS_API_URL}?action=getSyncLink`, { timeout: 15000 });
        const data = await response.json();
        if (data.success) {
            syncWatchLink = data.link || '';
            updateSyncButton();
            saveCachedSheetsData();
        }
    } catch (error) { console.error('Error loading sync link:', error); }
}

function updateSyncButton() {
    const button = document.getElementById('syncWatchBtn');
    button.classList.toggle('disabled', !syncWatchLink.trim());
    button.style.cursor = syncWatchLink.trim() ? 'pointer' : 'not-allowed';
}

function openSyncWatch() {
    if (!syncWatchLink.trim()) return alert(t('noSyncLink'));
    let url = syncWatchLink.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

function openEditSyncModal() {
    document.getElementById('syncModalTitle').textContent = t('syncModalTitle');
    document.getElementById('syncModalDescription').textContent = t('syncModalDescription');
    document.getElementById('syncLinkInput').placeholder = t('syncPlaceholder');
    document.getElementById('syncLinkInput').value = syncWatchLink;
    const saveBtn = document.querySelector('#editSyncModal .modal-button.primary');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = t('save');
    }
    document.querySelector('#editSyncModal .modal-button.secondary').textContent = t('cancel');
    document.getElementById('editSyncModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditSyncModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close')) return;
    document.getElementById('editSyncModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function saveSyncLink() {
    let newLink = document.getElementById('syncLinkInput').value.trim();
    if (newLink && !/^https?:\/\//i.test(newLink)) {
        newLink = 'https://' + newLink;
    }
    const saveBtn = document.querySelector('#editSyncModal .modal-button.primary');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="button-spinner"></span> ${t('saving')}`;
    }
    showToast(t('syncingSheets'), 'syncing', '🔄', 0);
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveSyncLink', link: newLink })
        });
        syncWatchLink = newLink;
        updateSyncButton();
        saveCachedSheetsData();
        closeEditSyncModal();
        showToast(t('syncSaved'), 'success', '✓', 2500);
    } catch (error) {
        console.error('Error saving sync link:', error);
        showToast(t('syncError'), 'error', '⚠️', 3500);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = t('save');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchBox')?.addEventListener('input', handleSearch);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeModal();
            closeEditSyncModal();
        }
    });

    try {
        const savedUser = localStorage.getItem('vandm_user');
        if (savedUser && ['vincenzo', 'millena'].includes(savedUser)) {
            login(savedUser);
        }
    } catch (e) {
        console.warn('localStorage error:', e);
    }
});

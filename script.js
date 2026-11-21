// V&M Watchlist - Disney+, Netflix, Prime Video & All Platforms
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwSl1vLF1Kvhaj4TlFyyIcLkk7la73nNteGTr-F6vtw8PWCJdpEAnZWjIwKoFv3Np1ntQ/exec';
const TMDB_API_KEY = 'e52e82734d4a34d3494787371a7149ba';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const PROVIDERS = {
    disney: { id: 337, name: 'Disney+' },
    netflix: { id: 8, name: 'Netflix' },
    prime: { id: 119, name: 'Prime Video' }
};

const GENRES = [
    { key: 'action', it: 'Azione', pt: 'Ação', movieIds: [28, 12], tvIds: [10759] },
    { key: 'comedy', it: 'Commedia', pt: 'Comédia', movieIds: [35], tvIds: [35] },
    { key: 'drama', it: 'Dramma', pt: 'Drama', movieIds: [18], tvIds: [18] },
    { key: 'animation', it: 'Animazione', pt: 'Animação', movieIds: [16], tvIds: [16] },
    { key: 'scifi', it: 'Fantascienza', pt: 'Ficção Científica', movieIds: [878, 14], tvIds: [10765] },
    { key: 'romance', it: 'Romance', pt: 'Romance', movieIds: [10749], tvIds: [18] },
    { key: 'horror', it: 'Horror & Thriller', pt: 'Terror & Suspense', movieIds: [27, 53], tvIds: [9648] },
    { key: 'crime', it: 'Crime & Mistero', pt: 'Crime & Mistério', movieIds: [80, 9648], tvIds: [80, 9648] },
    { key: 'family', it: 'Famiglia', pt: 'Família', movieIds: [10751], tvIds: [10751, 10762] },
    { key: 'doc', it: 'Documentario', pt: 'Documentário', movieIds: [99], tvIds: [99] }
];

let currentUser = null;
let allMovies = [];
let userLists = { vincenzo: [], millena: [] };
let seenMovies = { vincenzo: [], millena: [] };
let currentPage = 1;
let totalPages = 1;
let currentRegion = null;
let currentMainTab = 'catalog'; // 'catalog' or 'list'
let currentMediaType = 'movie';  // 'movie' or 'tv'
let selectedProviders = [];     // empty = all platforms
let selectedCatalogGenre = null; // null = all genres
let currentListSubTab = 'mylist'; // 'mylist', 'shared', or 'seen'
let currentListMediaType = 'all'; // 'all', 'movie', or 'tv'
let selectedListGenre = null;     // null = all genres
let filterOnlyUnsaved = false;
let listSearchQuery = '';
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
    catalog: new Map(),   // key: providers_mediaType_genre_region_lang_page
    search: new Map(),    // key: query_providers_mediaType_genre_region_lang_page
    providers: new Map(), // key: mediaType_id
    details: new Map()    // key: mediaType_id_lang
};

const translations = {
    vincenzo: {
        welcome: 'Ciao Vincenzo! 🇮🇹',
        logout: 'Esci',
        tabCatalog: '🎬 Catalogo',
        tabList: '📋 Lista',
        subTabMyList: 'La Mia Lista',
        subTabShared: 'Da Vedere Insieme ❤️',
        subTabSeen: 'Già Visti ✓',
        filterType: 'Tipo:',
        filterPlatforms: 'Piattaforme:',
        filterGenres: 'Genere:',
        filterViewLabel: 'Filtra:',
        filterUnsaved: '👁️ Solo non in lista o visti',
        platformAll: 'Tutte',
        typeAll: 'Tutti',
        moviesLabel: 'Film',
        seriesLabel: 'Serie TV',
        searchPlaceholder: 'Cerca film o serie TV...',
        searchPlaceholderList: 'Cerca tra i titoli salvati...',
        loading: 'Caricamento catalogo...',
        noMovies: 'Nessun titolo trovato',
        noMoviesSearch: 'Nessun titolo corrisponde alla ricerca o ai filtri',
        allMoviesSaved: 'Tutti i titoli di questa pagina sono già nella tua lista o visti! 🍿',
        addButton: '+ Aggiungi',
        addedButton: '✓ Nella mia lista',
        removeButton: 'Rimuovi',
        seenButton: 'Già visto',
        notSeenButton: 'Da vedere',
        partnerBadge: '❤️ Millena',
        sharedBadge: '💕 Insieme',
        seenBadge: '✓ Visto',
        myListTitle: 'La Mia Lista',
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
        tabCatalog: '🎬 Catálogo',
        tabList: '📋 Lista',
        subTabMyList: 'Minha Lista',
        subTabShared: 'Para Assistir Juntos ❤️',
        subTabSeen: 'Já Assistidos ✓',
        filterType: 'Tipo:',
        filterPlatforms: 'Plataformas:',
        filterGenres: 'Gênero:',
        filterViewLabel: 'Filtrar:',
        filterUnsaved: '👁️ Apenas não salvos / vistos',
        platformAll: 'Todas',
        typeAll: 'Todos',
        moviesLabel: 'Filmes',
        seriesLabel: 'Séries',
        searchPlaceholder: 'Buscar filmes ou séries...',
        searchPlaceholderList: 'Buscar nos títulos salvos...',
        loading: 'Carregando catálogo...',
        noMovies: 'Nenhum título encontrado',
        noMoviesSearch: 'Nenhum título corresponde à busca ou filtros',
        allMoviesSaved: 'Todos os títulos desta página já estão na sua lista ou foram assistidos! 🍿',
        addButton: '+ Adicionar',
        addedButton: '✓ Na minha lista',
        removeButton: 'Remover',
        seenButton: 'Já assistido',
        notSeenButton: 'Para assistir',
        partnerBadge: '❤️ Vincenzo',
        sharedBadge: '💕 Juntos',
        seenBadge: '✓ Assistido',
        myListTitle: 'Minha Lista',
        sharedTitle: 'Títulos para assistir juntos 💕',
        seenTitle: 'Títulos já assistidos juntos ✓',
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

function mapTmdbItem(item, mediaType, provider = 'all') {
    const title = mediaType === 'tv' ? item.name : item.title;
    const date = mediaType === 'tv' ? item.first_air_date : item.release_date;
    const genres = item.genre_ids || (item.genres ? item.genres.map(g => g.id) : []);
    return {
        id: item.id,
        title: title || t('noTitle'),
        year: date ? new Date(date).getFullYear() : 'N/A',
        poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
        overview: item.overview || '',
        rating: item.vote_average || 0,
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
        provider: item.provider || provider,
        mediaType,
        genre_ids: genres
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

async function fetchCatalog(page = 1) {
    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const provKey = selectedProviders.slice().sort().join('-') || 'all';
    const genreKey = selectedCatalogGenre || 'all';
    const cacheKey = `${provKey}_${currentMediaType}_${genreKey}_${regionCode}_${language}_${page}`;

    if (apiCache.catalog.has(cacheKey)) {
        return apiCache.catalog.get(cacheKey);
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language,
        page: String(page),
        sort_by: 'popularity.desc',
        watch_region: regionCode
    });

    if (selectedProviders.length > 0) {
        const ids = selectedProviders.map(p => PROVIDERS[p].id).join('|');
        params.set('with_watch_providers', ids);
        params.set('with_watch_monetization_types', 'flatrate');
    }

    if (selectedCatalogGenre) {
        const genreObj = GENRES.find(g => g.key === selectedCatalogGenre);
        if (genreObj) {
            const genreIds = currentMediaType === 'tv' ? genreObj.tvIds : genreObj.movieIds;
            params.set('with_genres', genreIds.join('|'));
        }
    }

    const response = await fetchWithTimeout(`${TMDB_BASE_URL}/discover/${currentMediaType}?${params}`);
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
    const data = await response.json();
    const rawMovies = data.results || [];

    if (selectedProviders.length === 1) {
        const singleProvider = selectedProviders[0];
        const result = {
            movies: rawMovies.map(item => mapTmdbItem(item, currentMediaType, singleProvider)),
            totalPages: Math.min(data.total_pages || 1, 500)
        };
        apiCache.catalog.set(cacheKey, result);
        return result;
    }

    // Per selezione multipla (es. Disney + Netflix) o "Tutte", recuperiamo i provider effettivi per ogni titolo
    await Promise.all(rawMovies.map(async item => {
        try {
            const providerKey = `${currentMediaType}_${item.id}`;
            let providerData = apiCache.providers.get(providerKey);
            if (!providerData) {
                const res = await fetchWithTimeout(
                    `${TMDB_BASE_URL}/${currentMediaType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`,
                    {},
                    4000
                );
                if (res.ok) {
                    providerData = await res.json();
                    apiCache.providers.set(providerKey, providerData);
                }
            }
        } catch (e) {
            // Silenzioso
        }
    }));

    const movies = rawMovies.map(item => {
        const providerKey = `${currentMediaType}_${item.id}`;
        const providerData = apiCache.providers.get(providerKey);
        let itemProvider = 'all';
        if (providerData) {
            const flatrate = providerData.results?.[regionCode]?.flatrate || [];
            const matched = Object.keys(PROVIDERS).filter(pKey =>
                flatrate.some(p => p.provider_id === PROVIDERS[pKey].id)
            );
            const targetMatched = selectedProviders.length > 0
                ? matched.filter(p => selectedProviders.includes(p))
                : matched;
            if (targetMatched.length > 0) {
                itemProvider = targetMatched.join('|');
            }
        }
        return mapTmdbItem(item, currentMediaType, itemProvider);
    });

    const result = {
        movies,
        totalPages: Math.min(data.total_pages || 1, 500)
    };
    apiCache.catalog.set(cacheKey, result);
    return result;
}

async function searchCatalog(query, page = 1) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return { movies: [], totalPages: 0 };
    const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
    const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
    const provKey = selectedProviders.slice().sort().join('-') || 'all';
    const genreKey = selectedCatalogGenre || 'all';
    const cacheKey = `${cleanQuery.toLowerCase()}_${provKey}_${currentMediaType}_${genreKey}_${regionCode}_${language}_${page}`;

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
    const response = await fetch(`${TMDB_BASE_URL}/search/${currentMediaType}?${params}`, { signal });
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
    const data = await response.json();
    let candidates = (data.results || []).slice(0, 20);

    // Filtra per genere se selezionato
    if (selectedCatalogGenre) {
        const genreObj = GENRES.find(g => g.key === selectedCatalogGenre);
        if (genreObj) {
            const genreIds = currentMediaType === 'tv' ? genreObj.tvIds : genreObj.movieIds;
            candidates = candidates.filter(item => (item.genre_ids || []).some(id => genreIds.includes(id)));
        }
    }

    if (selectedProviders.length === 0) {
        await Promise.all(candidates.map(async item => {
            try {
                const providerKey = `${currentMediaType}_${item.id}`;
                if (!apiCache.providers.has(providerKey)) {
                    const res = await fetchWithTimeout(
                        `${TMDB_BASE_URL}/${currentMediaType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`,
                        { signal },
                        4000
                    );
                    if (res.ok) {
                        const providerData = await res.json();
                        apiCache.providers.set(providerKey, providerData);
                    }
                }
            } catch (e) {}
        }));

        const movies = candidates.map(item => {
            const providerKey = `${currentMediaType}_${item.id}`;
            const providerData = apiCache.providers.get(providerKey);
            let itemProvider = 'all';
            if (providerData) {
                const flatrate = providerData.results?.[regionCode]?.flatrate || [];
                const matched = Object.keys(PROVIDERS).filter(pKey =>
                    flatrate.some(p => p.provider_id === PROVIDERS[pKey].id)
                );
                if (matched.length > 0) {
                    itemProvider = matched.join('|');
                }
            }
            return mapTmdbItem(item, currentMediaType, itemProvider);
        });

        const result = {
            movies,
            totalPages: Math.min(data.total_pages || 1, 500)
        };
        apiCache.search.set(cacheKey, result);
        return result;
    }

    const targetProviderIds = selectedProviders.map(p => PROVIDERS[p].id);
    const filtered = await Promise.all(candidates.map(async item => {
        try {
            const providerKey = `${currentMediaType}_${item.id}`;
            let providerData = apiCache.providers.get(providerKey);
            if (!providerData) {
                const providerResponse = await fetch(
                    `${TMDB_BASE_URL}/${currentMediaType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`,
                    { signal }
                );
                providerData = await providerResponse.json();
                apiCache.providers.set(providerKey, providerData);
            }
            const regionalProviders = providerData.results?.[regionCode]?.flatrate || [];
            const matched = Object.keys(PROVIDERS).filter(pKey =>
                regionalProviders.some(p => p.provider_id === PROVIDERS[pKey].id)
            );
            const targetMatched = matched.filter(p => targetProviderIds.includes(PROVIDERS[p].id));
            if (targetMatched.length === 0) return null;
            return mapTmdbItem(item, currentMediaType, targetMatched.join('|'));
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
                provider: row.provider || 'all',
                mediaType: row.mediaType || 'movie',
                genre_ids: Array.isArray(row.genre_ids) ? row.genre_ids : []
            };
            userLists[row.user].push(item);
            if (row.seen === true || row.seen === 'TRUE') seenMovies[row.user].push(item);
        });
        saveCachedSheetsData();
        populateMissingGenres([...userLists.vincenzo, ...userLists.millena]);
    } catch (error) {
        console.error('Error loading from Sheets:', error);
        if (!userLists.vincenzo.length && !userLists.millena.length) {
            showError(t('errorLoad'));
        }
    }
}

async function populateMissingGenres(items) {
    const missing = items.filter(m => !m.genre_ids || !m.genre_ids.length || !m.provider || m.provider === 'all' || m.provider.includes('-'));
    if (!missing.length) return;
    for (const item of missing.slice(0, 20)) {
        try {
            const cacheKey = `${item.mediaType || 'movie'}_${item.id}_it-IT`;
            let details = apiCache.details.get(cacheKey);
            if (!details) {
                const res = await fetchWithTimeout(`${TMDB_BASE_URL}/${item.mediaType || 'movie'}/${item.id}?api_key=${TMDB_API_KEY}&language=it-IT`);
                if (res.ok) {
                    details = await res.json();
                    apiCache.details.set(cacheKey, details);
                }
            }
            if (details?.genres) {
                item.genre_ids = details.genres.map(g => g.id);
            }

            const provKey = `${item.mediaType || 'movie'}_${item.id}`;
            if (!apiCache.providers.has(provKey)) {
                const resProv = await fetchWithTimeout(`${TMDB_BASE_URL}/${item.mediaType || 'movie'}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`);
                if (resProv.ok) {
                    const pData = await resProv.json();
                    apiCache.providers.set(provKey, pData);
                }
            }
        } catch (e) {
            // ignore
        }
    }
    saveCachedSheetsData();
    if (currentMainTab === 'list') {
        renderCurrentListSubTab();
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
        provider: item.provider || 'all', mediaType: item.mediaType || 'movie'
    }, t('errorSave'));
}

function removeFromSheets(user, item) {
    saveCachedSheetsData();
    return postToSheets({
        action: 'remove', user, movieId: item.id,
        provider: item.provider || 'all', mediaType: item.mediaType || 'movie'
    }, t('errorRemove'));
}

function markAsSeenInSheets(item, seen) {
    saveCachedSheetsData();
    return postToSheets({
        action: 'markSeen', movieId: item.id, seen,
        provider: item.provider || 'all', mediaType: item.mediaType || 'movie'
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
        renderCurrentListSubTab();
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

    loadCachedSheetsData();
    switchMainTab('catalog', document.getElementById('mainTabCatalogBtn'));
    syncWithSheets();
}

function updateUILanguage() {
    document.querySelector('.logout-btn').textContent = t('logout');
    document.getElementById('mainTabCatalogBtn').textContent = t('tabCatalog');
    document.getElementById('mainTabListBtn').textContent = t('tabList');
    document.getElementById('searchBox').placeholder = t('searchPlaceholder');
    document.getElementById('labelMediaType').textContent = t('filterType');
    document.getElementById('labelPlatforms').textContent = t('filterPlatforms');
    document.getElementById('labelCatalogGenres').textContent = t('filterGenres');
    document.getElementById('labelFilterView').textContent = t('filterViewLabel');
    document.getElementById('providerAllBtn').textContent = t('platformAll');
    document.getElementById('movieTypeMovies').textContent = t('moviesLabel');
    document.getElementById('movieTypeTv').textContent = t('seriesLabel');
    document.getElementById('filterUnsavedBtn').textContent = t('filterUnsaved');

    const listSearch = document.getElementById('listSearchBox');
    if (listSearch) listSearch.placeholder = t('searchPlaceholderList');

    document.getElementById('listTypeMyListBtn').textContent = t('subTabMyList');
    document.getElementById('listTypeSharedBtn').textContent = t('subTabShared');
    document.getElementById('listTypeSeenBtn').textContent = t('subTabSeen');
    document.getElementById('labelListMediaType').textContent = t('filterType');
    document.getElementById('labelListGenres').textContent = t('filterGenres');
    document.getElementById('listTypeAllBtn').textContent = t('typeAll');
    document.getElementById('listTypeMovieBtn').textContent = t('moviesLabel');
    document.getElementById('listTypeTvBtn').textContent = t('seriesLabel');

    renderGenreButtons();
    renderCurrentListSubTab();
}

function renderGenreButtons() {
    const lang = currentUser === 'millena' ? 'pt' : 'it';
    const renderBtns = (containerId, selectedKey, onclickFnName) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = GENRES.map(g => `
            <button class="filter-btn genre-btn ${selectedKey === g.key ? 'active' : ''}" 
                    onclick="${onclickFnName}('${g.key}')">
                ${g[lang]}
            </button>
        `).join('');
    };

    renderBtns('catalogGenreControls', selectedCatalogGenre, 'toggleCatalogGenre');
    renderBtns('listGenreControls', selectedListGenre, 'toggleListGenre');
}

function toggleCatalogGenre(genreKey) {
    if (selectedCatalogGenre === genreKey) {
        selectedCatalogGenre = null; // deseleziona -> tutti i generi
    } else {
        selectedCatalogGenre = genreKey;
    }
    renderGenreButtons();
    loadCatalog(1);
}

function toggleListGenre(genreKey) {
    if (selectedListGenre === genreKey) {
        selectedListGenre = null; // deseleziona -> tutti i generi
    } else {
        selectedListGenre = genreKey;
    }
    renderGenreButtons();
    renderCurrentListSubTab();
}

function setListMediaType(type, button) {
    currentListMediaType = type;
    document.querySelectorAll('#listMediaTypeControls .filter-btn').forEach(btn => btn.classList.remove('active'));
    button?.classList.add('active');
    renderCurrentListSubTab();
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
    selectedProviders = [];
    selectedCatalogGenre = null;
    selectedListGenre = null;
    currentListMediaType = 'all';
    currentMainTab = 'catalog';
    currentListSubTab = 'mylist';
    listSearchQuery = '';
    filterOnlyUnsaved = false;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
    document.body.classList.remove('vincenzo-color');
    hideToast();
}

// Main Tabs Navigation
function switchMainTab(tab, button) {
    currentMainTab = tab;
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content > .tab-content').forEach(panel => panel.style.display = 'none');
    button?.classList.add('active');

    if (tab === 'catalog') {
        document.getElementById('catalogTab').style.display = 'block';
        loadCatalog(currentPage);
    } else if (tab === 'list') {
        document.getElementById('listTab').style.display = 'block';
        renderCurrentListSubTab();
    }
}

// List Sub-Tabs Navigation (Single-Select)
function switchListSubTab(subTab, button) {
    currentListSubTab = subTab;
    document.querySelectorAll('#listTypeControls .filter-btn').forEach(btn => btn.classList.remove('active'));
    button?.classList.add('active');
    renderCurrentListSubTab();
}

function renderCurrentListSubTab() {
    const titleEl = document.getElementById('listSectionTitle');
    if (currentListSubTab === 'mylist') {
        if (titleEl) titleEl.textContent = t('myListTitle');
        updateMyList();
    } else if (currentListSubTab === 'shared') {
        if (titleEl) titleEl.textContent = t('sharedTitle');
        updateSharedList();
    } else if (currentListSubTab === 'seen') {
        if (titleEl) titleEl.textContent = t('seenTitle');
        updateSeenList();
    }
}

function handleListSearch() {
    listSearchQuery = document.getElementById('listSearchBox')?.value.trim().toLowerCase() || '';
    renderCurrentListSubTab();
}

// Media Type Filter (Film / Serie TV)
function setMediaType(mediaType, button) {
    currentMediaType = mediaType;
    document.querySelectorAll('#mediaTypeControls .filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    loadCatalog(1);
}

// Provider Multiselect Filter
function toggleProvider(providerKey) {
    if (providerKey === 'all') {
        selectedProviders = [];
    } else {
        const index = selectedProviders.indexOf(providerKey);
        if (index > -1) {
            selectedProviders.splice(index, 1);
        } else {
            selectedProviders.push(providerKey);
        }
    }
    updateProviderButtonsUI();
    loadCatalog(1);
}

function updateProviderButtonsUI() {
    const isAll = selectedProviders.length === 0;
    document.getElementById('providerAllBtn')?.classList.toggle('active', isAll);
    document.getElementById('providerDisneyBtn')?.classList.toggle('active', selectedProviders.includes('disney'));
    document.getElementById('providerNetflixBtn')?.classList.toggle('active', selectedProviders.includes('netflix'));
    document.getElementById('providerPrimeBtn')?.classList.toggle('active', selectedProviders.includes('prime'));
}

function toggleFilterUnsaved(button) {
    filterOnlyUnsaved = !filterOnlyUnsaved;
    button?.classList.toggle('active', filterOnlyUnsaved);
    displayCatalog(allMovies);
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
    const provKey = selectedProviders.slice().sort().join('-') || 'all';
    const genreKey = selectedCatalogGenre || 'all';
    const cacheKey = `${provKey}_${currentMediaType}_${genreKey}_${regionCode}_${language}_${page}`;

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
        const result = await fetchCatalog(page);
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
    const provKey = selectedProviders.slice().sort().join('-') || 'all';
    const genreKey = selectedCatalogGenre || 'all';
    const cacheKey = `${cleanQuery}_${provKey}_${currentMediaType}_${genreKey}_${regionCode}_${language}_${page}`;

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
        const result = await searchCatalog(query, page);
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

    // Trova tutti i provider associati a questo titolo
    const providersSet = new Set();
    const addProviderKey = (p) => {
        if (!p || p === 'all') return;
        p.split('|').forEach(key => {
            const cleanKey = key.trim();
            if (PROVIDERS[cleanKey]) providersSet.add(cleanKey);
        });
    };

    addProviderKey(item.provider);
    if (partnerItem?.provider) addProviderKey(partnerItem.provider);
    if (myItem?.provider) addProviderKey(myItem.provider);

    const cachedProviderData = apiCache.providers.get(`${item.mediaType}_${item.id}`);
    if (cachedProviderData) {
        const regionCode = currentRegion === 'italy' ? 'IT' : 'BR';
        const flatrate = cachedProviderData.results?.[regionCode]?.flatrate || [];
        Object.keys(PROVIDERS).forEach(pKey => {
            if (flatrate.some(p => p.provider_id === PROVIDERS[pKey].id)) {
                if (currentMainTab === 'catalog' && selectedProviders.length > 0) {
                    if (selectedProviders.includes(pKey)) {
                        providersSet.add(pKey);
                    }
                } else {
                    providersSet.add(pKey);
                }
            }
        });
    }

    const platformBadgesHtml = providersSet.size > 0
        ? `<div class="platform-badges">${[...providersSet].map(p => `<span class="platform-badge ${p}">${PROVIDERS[p]?.name || p}</span>`).join('')}</div>`
        : '';

    let actionBtn;
    if (isPending) {
        let baseClass = 'add-btn';
        if (options.isRemove) baseClass = 'add-btn remove-btn';
        else if (options.isSeenBtn) baseClass = 'seen-btn';
        else if (options.isNotSeenBtn) baseClass = 'add-btn not-seen-btn';
        else if (inMyList) baseClass = 'add-btn added';
        actionBtn = `<button class="${baseClass} syncing" disabled><span class="button-spinner"></span> ${t('saving')}</button>`;
    } else if (options.action) {
        actionBtn = options.action;
    } else {
        actionBtn = `<button class="add-btn ${inMyList ? 'added' : ''}" onclick="toggleMovie(${item.id}, '${item.mediaType}', '${item.provider}')">${inMyList ? t('addedButton') : t('addButton')}</button>`;
    }

    return `<div class="movie-card ${isPending ? 'card-pending' : ''}">
        <div class="poster-container" onclick="openMovieModal(${item.id}, '${item.mediaType}', '${item.provider}')">
            ${options.showPartner && inPartnerList ? `<div class="partner-badge">${t('partnerBadge')}</div>` : ''}
            ${options.showSeen && isSeen ? `<div class="seen-badge">${t('seenBadge')}</div>` : ''}
            <img src="${item.poster || ''}" alt="${escapeHtml(item.title)}" class="movie-poster" onerror="this.style.visibility='hidden'">
            ${platformBadgesHtml}
        </div>
        <div class="movie-title" title="${escapeHtml(item.title)}" onclick="openMovieModal(${item.id}, '${item.mediaType}', '${item.provider}')">${escapeHtml(item.title)}</div>
        <div class="movie-year">${item.year || 'N/A'} · ${mediaLabel}</div>
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

    let displayItems = items;
    if (filterOnlyUnsaved) {
        displayItems = displayItems.filter(item => {
            const key = getMovieKey(item);
            const inMyList = userLists[currentUser].some(m => getMovieKey(m) === key);
            const isSeen = seenMovies.vincenzo.some(m => getMovieKey(m) === key)
                || seenMovies.millena.some(m => getMovieKey(m) === key);
            return !inMyList && !isSeen;
        });
    }

    if (!displayItems.length) {
        const msg = filterOnlyUnsaved && items.length > 0
            ? t('allMoviesSaved')
            : t('noMovies');
        grid.innerHTML = `<div class="empty-state">${msg}</div>`;
        const pagination = getCatalogPagination();
        if (pagination && !items.length) pagination.innerHTML = '';
        return;
    }
    grid.innerHTML = displayItems.map(item => renderMovieCard(item, { showPartner: true, showSeen: true })).join('');
}

async function toggleMovie(id, mediaType = currentMediaType, provider = 'all') {
    const key = getMovieKey({ id, mediaType });
    const item = allMovies.find(m => getMovieKey(m) === key)
        || userLists[currentUser].find(m => getMovieKey(m) === key)
        || userLists[currentUser === 'vincenzo' ? 'millena' : 'vincenzo'].find(m => getMovieKey(m) === key)
        || currentModalMovie;
    if (!item) return;

    if (pendingSyncKeys.has(key)) return;
    pendingSyncKeys.add(key);

    const index = userLists[currentUser].findIndex(m => getMovieKey(m) === key);
    const isAdding = index === -1;

    // Feedback visivo immediato lasciando la card con bottone in stato "Salvataggio..."
    displayCatalog(allMovies);
    renderCurrentListSubTab();
    updateModalAddButton();
    showToast(t('syncingSheets'), 'syncing', '🔄', 0);

    try {
        let ok = false;
        if (isAdding) {
            ok = await addToSheets(currentUser, item);
            if (ok) {
                userLists[currentUser].push(item);
                saveCachedSheetsData();
            }
        } else {
            const itemToRemove = userLists[currentUser][index];
            ok = await removeFromSheets(currentUser, itemToRemove);
            if (ok) {
                userLists[currentUser].splice(index, 1);
                seenMovies[currentUser] = seenMovies[currentUser].filter(m => getMovieKey(m) !== key);
                saveCachedSheetsData();
            }
        }

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
        renderCurrentListSubTab();
        updateModalAddButton();
    }
}

function filterListItems(rawItems) {
    let items = rawItems;

    // 1. Filtro Tipo (Tutti, Film, Serie TV)
    if (currentListMediaType !== 'all') {
        items = items.filter(m => (m.mediaType || 'movie') === currentListMediaType);
    }

    // 2. Filtro Genere (singolo selezionato o tutti)
    if (selectedListGenre) {
        const genreObj = GENRES.find(g => g.key === selectedListGenre);
        if (genreObj) {
            const targetIds = [...genreObj.movieIds, ...genreObj.tvIds];
            items = items.filter(m => Array.isArray(m.genre_ids) && m.genre_ids.some(gid => targetIds.includes(gid)));
        }
    }

    // 3. Ricerca testuale interna
    if (listSearchQuery) {
        items = items.filter(m => (m.title || '').toLowerCase().includes(listSearchQuery));
    }

    return items;
}

function updateMyList() {
    const target = document.getElementById('listContent');
    if (!target) return;
    const items = filterListItems(userLists[currentUser]);
    const isFiltered = listSearchQuery || currentListMediaType !== 'all' || selectedListGenre !== null;
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            showPartner: true,
            showSeen: true,
            isRemove: true,
            action: `<button class="add-btn remove-btn" onclick="toggleMovie(${item.id}, '${item.mediaType}', '${item.provider}')">🗑️ ${t('removeButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${isFiltered ? t('noMoviesSearch') : t('emptyMyList')}</div>`;
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
    const target = document.getElementById('listContent');
    if (!target) return;
    const items = filterListItems(getSharedItems());
    const isFiltered = listSearchQuery || currentListMediaType !== 'all' || selectedListGenre !== null;
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            isSeenBtn: true,
            action: `<button class="seen-btn" onclick="toggleSeen(${item.id}, true, '${item.mediaType}', '${item.provider}')">✓ ${t('seenButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${isFiltered ? t('noMoviesSearch') : t('emptyShared')}</div>`;
}

function updateSeenList() {
    const target = document.getElementById('listContent');
    if (!target) return;
    const baseItems = seenMovies.vincenzo.filter(item =>
        seenMovies.millena.some(other => getMovieKey(other) === getMovieKey(item)));
    const items = filterListItems(baseItems);
    const isFiltered = listSearchQuery || currentListMediaType !== 'all' || selectedListGenre !== null;
    target.innerHTML = items.length
        ? `<div class="movies-grid">${items.map(item => renderMovieCard(item, {
            isNotSeenBtn: true,
            action: `<button class="add-btn not-seen-btn" onclick="toggleSeen(${item.id}, false, '${item.mediaType}', '${item.provider}')">↺ ${t('notSeenButton')}</button>`
        })).join('')}</div>`
        : `<div class="empty-state">${isFiltered ? t('noMoviesSearch') : t('emptySeen')}</div>`;
}

async function toggleSeen(id, seen, mediaType = 'movie', provider = 'all') {
    const key = getMovieKey({ id, mediaType });
    const item = userLists.vincenzo.find(m => getMovieKey(m) === key)
        || userLists.millena.find(m => getMovieKey(m) === key);
    if (!item) return;

    if (pendingSyncKeys.has(key)) return;
    pendingSyncKeys.add(key);

    renderCurrentListSubTab();
    showToast(t('syncingSheets'), 'syncing', '🔄', 0);

    try {
        const ok = await markAsSeenInSheets(item, seen);
        if (ok) {
            for (const user of ['vincenzo', 'millena']) {
                seenMovies[user] = seen
                    ? [...seenMovies[user].filter(m => getMovieKey(m) !== key), item]
                    : seenMovies[user].filter(m => getMovieKey(m) !== key);
            }
            saveCachedSheetsData();
            showToast(t('syncedSheets'), 'success', '✓', 2200);
        } else {
            showToast(t('syncError'), 'error', '⚠️', 3500);
        }
    } catch (e) {
        console.error('Mark seen error:', e);
        showToast(t('syncError'), 'error', '⚠️', 3500);
    } finally {
        pendingSyncKeys.delete(key);
        renderCurrentListSubTab();
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
async function openMovieModal(id, mediaType = currentMediaType, provider = 'all') {
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

        let provName = '';
        const modalProviders = [];
        if (item.provider && item.provider !== 'all') {
            item.provider.split('|').forEach(p => {
                const clean = p.trim();
                if (PROVIDERS[clean]) modalProviders.push(PROVIDERS[clean].name);
            });
        }
        if (modalProviders.length > 0) {
            provName = ` · ${modalProviders.join(', ')}`;
        }
        document.getElementById('modalYear').textContent = `${item.year}${provName} · ${mediaType === 'tv' ? t('seriesLabel') : t('moviesLabel')}`;
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
    document.getElementById('listSearchBox')?.addEventListener('input', handleListSearch);
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

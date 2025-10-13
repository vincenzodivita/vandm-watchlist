// Google Sheets API URL
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwSl1vLF1Kvhaj4TlFyyIcLkk7la73nNteGTr-F6vtw8PWCJdpEAnZWjIwKoFv3Np1ntQ/exec';

// TMDB API Configuration
const TMDB_API_KEY = 'e52e82734d4a34d3494787371a7149ba';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Global State
let currentUser = null;
let allMovies = [];
let userLists = { vincenzo: [], millena: [] };
let seenMovies = { vincenzo: [], millena: [] };
let isLoadingMovies = false;
let currentPage = 1;
let totalPages = 1;
let currentRegion = null;
let isSearching = false;
let currentSearchQuery = '';
let currentModalMovie = null;

// Translations
const translations = {
    vincenzo: {
        welcome: 'Ciao Vincenzo! 🇮🇹',
        logout: 'Esci',
        tabCatalog: 'Catalogo Disney+',
        tabMyList: 'La Mia Lista',
        tabShared: 'Da Vedere Insieme ❤️',
        tabSeen: 'Già Visti ✓',
        searchPlaceholder: 'Cerca su Disney+ Italia...',
        loading: 'Caricamento catalogo...',
        noMovies: 'Nessun film trovato',
        addButton: '+ Aggiungi',
        addedButton: '✓ Nella mia lista',
        removeButton: '✓ Rimuovi',
        seenButton: '✓ Già visto',
        notSeenButton: '↺ Da vedere',
        partnerBadge: '❤️ Millena',
        sharedBadge: '💕 Insieme',
        seenBadge: '✓ Visto',
        sharedTitle: 'Film che volete vedere insieme 💕',
        seenTitle: 'Film che avete già visto insieme ✓',
        emptyMyList: 'La tua lista è vuota. Aggiungi film dal catalogo!',
        emptyShared: 'Nessun film in comune ancora. Aggiungete i vostri film preferiti! 💑',
        emptySeen: 'Non avete ancora visto nessun film insieme. Guardate qualcosa e segnate come visto! 🎬',
        errorLoad: 'Errore nel caricamento dei dati da Google Sheets',
        errorSave: 'Errore nel salvataggio su Google Sheets',
        errorRemove: 'Errore nella rimozione da Google Sheets',
        close: 'Chiudi',
        previous: 'Precedente',
        next: 'Successiva',
        page: 'Pagina',
        of: 'di'
    },
    millena: {
        welcome: 'Olá Millena! 🇧🇷',
        logout: 'Sair',
        tabCatalog: 'Catálogo Disney+',
        tabMyList: 'Minha Lista',
        tabShared: 'Para Assistir Juntos ❤️',
        tabSeen: 'Já Assistidos ✓',
        searchPlaceholder: 'Buscar no Disney+ Brasil...',
        loading: 'Carregando catálogo...',
        noMovies: 'Nenhum filme encontrado',
        addButton: '+ Adicionar',
        addedButton: '✓ Na minha lista',
        removeButton: '✓ Remover',
        seenButton: '✓ Já assistido',
        notSeenButton: '↺ Para assistir',
        partnerBadge: '❤️ Vincenzo',
        sharedBadge: '💕 Juntos',
        seenBadge: '✓ Assistido',
        sharedTitle: 'Filmes que vocês querem assistir juntos 💕',
        seenTitle: 'Filmes que vocês já assistiram juntos ✓',
        emptyMyList: 'Sua lista está vazia. Adicione filmes do catálogo!',
        emptyShared: 'Nenhum filme em comum ainda. Adicionem seus filmes favoritos! 💑',
        emptySeen: 'Vocês ainda não assistiram nenhum filme juntos. Assistam algo e marquem como visto! 🎬',
        errorLoad: 'Erro ao carregar dados do Google Sheets',
        errorSave: 'Erro ao salvar no Google Sheets',
        errorRemove: 'Erro ao remover do Google Sheets',
        close: 'Fechar',
        previous: 'Anterior',
        next: 'Próxima',
        page: 'Página',
        of: 'de'
    }
};

function t(key) {
    return translations[currentUser]?.[key] || key;
}

// TMDB API Functions
async function fetchDisneyMovies(region, page = 1) {
    if (isLoadingMovies) return { movies: [], totalPages: 1 };
    isLoadingMovies = true;

    try {
        const watchRegion = region === 'italy' ? 'IT' : 'BR';
        const language = region === 'italy' ? 'it-IT' : 'pt-BR';
        
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=337&watch_region=${watchRegion}&language=${language}&sort_by=popularity.desc&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            const result = await fetchPopularDisneyMovies(page, language);
            isLoadingMovies = false;
            return result;
        }
        
        const movies = data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '',
            overview: movie.overview,
            rating: movie.vote_average,
            backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : ''
        }));
        
        isLoadingMovies = false;
        return { movies, totalPages: data.total_pages || 1 };
        
    } catch (error) {
        console.error('Error fetching from TMDB:', error);
        isLoadingMovies = false;
        showError(t('errorLoad'));
        return { movies: [], totalPages: 1 };
    }
}

async function fetchPopularDisneyMovies(page = 1, language = 'en-US') {
    try {
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_companies=2|3&language=${language}&sort_by=popularity.desc&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const movies = data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '',
            overview: movie.overview,
            rating: movie.vote_average,
            backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : ''
        }));
        
        return { movies, totalPages: data.total_pages || 1 };
        
    } catch (error) {
        console.error('Error fetching popular Disney movies:', error);
        return { movies: [], totalPages: 1 };
    }
}

async function searchMovies(query, page = 1) {
    if (!query || query.trim() === '') {
        return { movies: [], totalPages: 0 };
    }

    try {
        const watchRegion = currentRegion === 'italy' ? 'IT' : 'BR';
        const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
        
        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${language}&page=${page}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            return { movies: [], totalPages: 0 };
        }
        
        const filteredMovies = [];
        
        for (const movie of data.results.slice(0, 20)) {
            try {
                const providersUrl = `${TMDB_BASE_URL}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`;
                const providersResponse = await fetch(providersUrl);
                const providersData = await providersResponse.json();
                
                const regionData = providersData.results?.[watchRegion];
                const hasDisneyPlus = regionData?.flatrate?.some(provider => provider.provider_id === 337);
                
                if (hasDisneyPlus) {
                    const detailUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=${language}`;
                    const detailResponse = await fetch(detailUrl);
                    const details = await detailResponse.json();
                    
                    filteredMovies.push({
                        id: details.id,
                        title: details.title,
                        year: details.release_date ? new Date(details.release_date).getFullYear() : 'N/A',
                        poster: details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : '',
                        overview: details.overview,
                        rating: details.vote_average,
                        backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : ''
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('Error checking movie providers:', error);
            }
        }
        
        return {
            movies: filteredMovies,
            totalPages: filteredMovies.length > 0 ? Math.ceil(data.total_results / 20) : 0
        };
        
    } catch (error) {
        console.error('Error searching movies:', error);
        return { movies: [], totalPages: 0 };
    }
}

// Google Sheets API Functions
async function loadFromSheets() {
    try {
        const response = await fetch(`${SHEETS_API_URL}?action=getAll`);
        const data = await response.json();
        
        if (data.success) {
            userLists = { vincenzo: [], millena: [] };
            seenMovies = { vincenzo: [], millena: [] };
            
            data.movies.forEach(movie => {
                if (movie.user === 'vincenzo' || movie.user === 'millena') {
                    const movieData = {
                        id: movie.movieId,
                        title: movie.title,
                        year: movie.year,
                        poster: movie.poster
                    };
                    
                    userLists[movie.user].push(movieData);
                    
                    if (movie.seen === true || movie.seen === 'TRUE') {
                        seenMovies[movie.user].push(movieData);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading from sheets:', error);
        showError(t('errorLoad'));
    }
}

async function addToSheets(user, movie) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add',
                user: user,
                movieId: movie.id,
                title: movie.title,
                year: movie.year,
                poster: movie.poster
            })
        });
        return true;
    } catch (error) {
        console.error('Error adding to sheets:', error);
        showError(t('errorSave'));
        return false;
    }
}

async function removeFromSheets(user, movieId) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove',
                user: user,
                movieId: movieId
            })
        });
        return true;
    } catch (error) {
        console.error('Error removing from sheets:', error);
        showError(t('errorRemove'));
        return false;
    }
}

async function markAsSeenInSheets(movieId, seenStatus) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'markSeen',
                movieId: movieId,
                seen: seenStatus
            })
        });
        return true;
    } catch (error) {
        console.error('Error marking as seen:', error);
        showError(t('errorSave'));
        return false;
    }
}

function showError(message) {
    const catalogContent = document.getElementById('catalogContent');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    catalogContent.insertBefore(errorDiv, catalogContent.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Login & Logout
async function login(user) {
    currentUser = user;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    
    document.getElementById('welcomeText').textContent = t('welcome');
    
    if (user === 'vincenzo') {
        document.body.classList.add('vincenzo-color');
    }
    
    updateUILanguage();
    await loadFromSheets();
    
    currentRegion = user === 'vincenzo' ? 'italy' : 'brazil';
    loadCatalog(1);
}

function updateUILanguage() {
    document.querySelector('.logout-btn').textContent = t('logout');
    const tabs = document.querySelectorAll('.tab-btn');
    tabs[0].textContent = t('tabCatalog');
    tabs[1].textContent = t('tabMyList');
    tabs[2].textContent = t('tabShared');
    tabs[3].textContent = t('tabSeen');
    document.getElementById('searchBox').placeholder = t('searchPlaceholder');
    document.getElementById('sharedTitle').textContent = t('sharedTitle');
    document.getElementById('seenTitle').textContent = t('seenTitle');
}

function logout() {
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
}

// Catalog Functions
async function loadCatalog(page = 1) {
    const region = currentUser === 'vincenzo' ? 'italy' : 'brazil';
    currentRegion = region;
    currentPage = page;
    isSearching = false;
    currentSearchQuery = '';
    
    const searchBox = document.getElementById('searchBox');
    if (searchBox) searchBox.value = '';
    
    document.getElementById('catalogContent').innerHTML = `<div class="loading">${t('loading')}</div>`;
    
    const result = await fetchDisneyMovies(region, page);
    allMovies = result.movies;
    totalPages = result.totalPages;
    
    displayCatalog(allMovies);
    updatePagination();
}

async function loadSearchResults(query, page = 1) {
    isSearching = true;
    currentSearchQuery = query;
    currentPage = page;
    
    document.getElementById('catalogContent').innerHTML = `<div class="loading">${t('loading')}</div>`;
    
    const result = await searchMovies(query, page);
    allMovies = result.movies;
    totalPages = result.totalPages;
    
    if (allMovies.length === 0) {
        document.getElementById('catalogContent').innerHTML = `<div class="empty-state">${t('noMovies')}</div>`;
    } else {
        displayCatalog(allMovies);
        updatePagination();
    }
}

function updatePagination() {
    const catalogContent = document.getElementById('catalogContent');
    
    if (totalPages <= 1) return;
    
    const paginationHTML = `
        <div class="pagination">
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                ◀ ${t('previous')}
            </button>
            <span class="page-info">
                ${t('page')} ${currentPage} ${t('of')} ${totalPages}
            </span>
            <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                ${t('next')} ▶
            </button>
        </div>
    `;
    catalogContent.innerHTML += paginationHTML;
}

async function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (isSearching && currentSearchQuery) {
        await loadSearchResults(currentSearchQuery, newPage);
    } else {
        await loadCatalog(newPage);
    }
}

function displayCatalog(movies) {
    const catalogContent = document.getElementById('catalogContent');
    
    if (movies.length === 0) {
        catalogContent.innerHTML = `<div class="empty-state">${t('noMovies')}</div>`;
        return;
    }

    const otherUser = currentUser === 'vincenzo' ? 'millena' : 'vincenzo';

    catalogContent.innerHTML = '<div class="movies-grid">' + movies.map(movie => {
        const isInMyList = userLists[currentUser].some(m => m.id === movie.id);
        const isInPartnerList = userLists[otherUser].some(m => m.id === movie.id);
        
        return `
            <div class="movie-card">
                ${isInPartnerList ? `<div class="partner-badge">${t('partnerBadge')}</div>` : ''}
                <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onclick="openMovieModal(${movie.id})" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'300\\'%3E%3Crect fill=\\'%23333\\' width=\\'200\\' height=\\'300\\'/%3E%3Ctext fill=\\'%23fff\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3E🎬%3C/text%3E%3C/svg%3E'">
                <div class="movie-title" onclick="openMovieModal(${movie.id})">${movie.title}</div>
                <div class="movie-year">${movie.year}</div>
                ${movie.rating ? `<div class="movie-rating">⭐ ${movie.rating.toFixed(1)}</div>` : ''}
                <button class="add-btn ${isInMyList ? 'added' : ''}" onclick="toggleMovie(${movie.id})">
                    ${isInMyList ? t('addedButton') : t('addButton')}
                </button>
            </div>
        `;
    }).join('') + '</div>';
}

async function toggleMovie(movieId) {
    const movie = allMovies.find(m => m.id === movieId);
    if (!movie) return;

    const index = userLists[currentUser].findIndex(m => m.id === movieId);
    
    if (index === -1) {
        userLists[currentUser].push(movie);
        await addToSheets(currentUser, movie);
    } else {
        userLists[currentUser].splice(index, 1);
        await removeFromSheets(currentUser, movieId);
    }

    displayCatalog(allMovies);
    updateMyList();
    updateSharedList();
}

// List Updates
function updateMyList() {
    const mylistContent = document.getElementById('mylistContent');
    const myMovies = userLists[currentUser];

    if (myMovies.length === 0) {
        mylistContent.innerHTML = `<div class="empty-state">${t('emptyMyList')}</div>`;
        return;
    }

    mylistContent.innerHTML = myMovies.map(movie => `
        <div class="movie-card">
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'300\\'%3E%3Crect fill=\\'%23333\\' width=\\'200\\' height=\\'300\\'/%3E%3Ctext fill=\\'%23fff\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3E🎬%3C/text%3E%3C/svg%3E'">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-year">${movie.year}</div>
            <button class="add-btn added" onclick="toggleMovie(${movie.id})">${t('removeButton')}</button>
        </div>
    `).join('');
}

function updateSharedList() {
    const sharedContent = document.getElementById('sharedContent');
    const sharedMovies = userLists.vincenzo.filter(movie => 
        userLists.millena.some(m => m.id === movie.id)
    ).filter(movie => 
        !(seenMovies.vincenzo.some(m => m.id === movie.id) && 
          seenMovies.millena.some(m => m.id === movie.id))
    );

    if (sharedMovies.length === 0) {
        sharedContent.innerHTML = `<div class="empty-state">${t('emptyShared')}</div>`;
        return;
    }

    sharedContent.innerHTML = sharedMovies.map(movie => `
        <div class="movie-card">
            <div class="shared-badge">${t('sharedBadge')}</div>
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'300\\'%3E%3Crect fill=\\'%23333\\' width=\\'200\\' height=\\'300\\'/%3E%3Ctext fill=\\'%23fff\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3E🎬%3C/text%3E%3C/svg%3E'">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-year">${movie.year}</div>
            <button class="seen-btn" onclick="toggleSeen(${movie.id}, true)">${t('seenButton')}</button>
        </div>
    `).join('');
}

function updateSeenList() {
    const seenContent = document.getElementById('seenContent');
    const sharedSeenMovies = seenMovies.vincenzo.filter(movie => 
        seenMovies.millena.some(m => m.id === movie.id)
    );

    if (sharedSeenMovies.length === 0) {
        seenContent.innerHTML = `<div class="empty-state">${t('emptySeen')}</div>`;
        return;
    }

    seenContent.innerHTML = sharedSeenMovies.map(movie => `
        <div class="movie-card">
            <div class="seen-badge">${t('seenBadge')}</div>
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'300\\'%3E%3Crect fill=\\'%23333\\' width=\\'200\\' height=\\'300\\'/%3E%3Ctext fill=\\'%23fff\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3E🎬%3C/text%3E%3C/svg%3E'">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-year">${movie.year}</div>
            <button class="add-btn" onclick="toggleSeen(${movie.id}, false)">${t('notSeenButton')}</button>
        </div>
    `).join('');
}

async function toggleSeen(movieId, markAsSeen) {
    const movie = userLists.vincenzo.find(m => m.id === movieId) || 
                  userLists.millena.find(m => m.id === movieId);
    
    if (!movie) return;
    
    if (markAsSeen) {
        if (!seenMovies.vincenzo.some(m => m.id === movieId)) {
            seenMovies.vincenzo.push(movie);
        }
        if (!seenMovies.millena.some(m => m.id === movieId)) {
            seenMovies.millena.push(movie);
        }
    } else {
        seenMovies.vincenzo = seenMovies.vincenzo.filter(m => m.id !== movieId);
        seenMovies.millena = seenMovies.millena.filter(m => m.id !== movieId);
    }
    
    await markAsSeenInSheets(movieId, markAsSeen);
    
    updateSharedList();
    updateSeenList();
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    event.target.classList.add('active');
    
    if (tab === 'catalog') {
        document.getElementById('catalogTab').style.display = 'block';
    } else if (tab === 'mylist') {
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

// Search
let searchTimeout = null;

function handleSearch() {
    const searchBox = document.getElementById('searchBox');
    const query = searchBox.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query === '') {
        loadCatalog(1);
        return;
    }
    
    searchTimeout = setTimeout(() => {
        loadSearchResults(query, 1);
    }, 500);
}

// Modal Functions
async function openMovieModal(movieId) {
    try {
        const language = currentRegion === 'italy' ? 'it-IT' : 'pt-BR';
        
        const detailUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=${language}`;
        const response = await fetch(detailUrl);
        const movie = await response.json();
        
        currentModalMovie = {
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '',
            overview: movie.overview,
            rating: movie.vote_average
        };
        
        document.getElementById('modalBackdrop').src = movie.backdrop_path ? 
            `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : 
            currentModalMovie.poster;
        document.getElementById('modalTitle').textContent = movie.title;
        document.getElementById('modalYear').textContent = currentModalMovie.year;
        document.getElementById('modalRating').textContent = movie.vote_average ? 
            `⭐ ${movie.vote_average.toFixed(1)}` : '';
        document.getElementById('modalOverview').textContent = movie.overview || 
            (currentUser === 'vincenzo' ? 'Nessuna descrizione disponibile.' : 'Nenhuma descrição disponível.');
        
        const isInList = userLists[currentUser].some(m => m.id === movieId);
        const addButton = document.getElementById('modalAddButton');
        addButton.textContent = isInList ? t('removeButton') : t('addButton');
        addButton.className = `modal-button ${isInList ? 'secondary' : 'primary'}`;
        
        document.querySelector('.modal-button.secondary:last-child').textContent = t('close');
        
        document.getElementById('movieModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading movie details:', error);
    }
}

function closeModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close')) {
        return;
    }
    
    document.getElementById('movieModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentModalMovie = null;
}

async function toggleMovieFromModal() {
    if (!currentModalMovie) return;
    
    await toggleMovie(currentModalMovie.id);
    
    const isInList = userLists[currentUser].some(m => m.id === currentModalMovie.id);
    const addButton = document.getElementById('modalAddButton');
    addButton.textContent = isInList ? t('removeButton') : t('addButton');
    addButton.className = `modal-button ${isInList ? 'secondary' : 'primary'}`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', handleSearch);
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

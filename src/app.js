import './styles.css';

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(_reg => console.log('Service Worker зарегистрирован'))
            .catch(_err => console.log('Service Worker ошибка регистрации'));
    });
}

// DefinePlugin подставляет API_URL при сборке (dev: /api/news, prod: полный URL)
const API_URL = process.env.API_URL || '/api/news';

// Состояния приложения
const states = {
    LOADING: 'loading',
    CONTENT: 'content',
    ERROR: 'error'
};

let currentState = states.LOADING;
let retryCount = 0;
const MAX_RETRIES = 3;

// DOM элементы
const loadingState = document.getElementById('loadingState');
const contentState = document.getElementById('contentState');
const errorState = document.getElementById('errorState');
const refreshBtn = document.querySelector('.refresh-btn');
const newsList = document.getElementById('newsList');

// Загрузка новостей
async function loadNews() {
    try {
        setState(states.LOADING);
        refreshBtn.disabled = true;
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('Ошибка запроса');
        }
        
        const data = await response.json();
        displayNews(data.news);
        setState(states.CONTENT);
        retryCount = 0; // Сброс счетчика
        
    } catch (error) {
        console.error('Error loading news:', error);
        
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(loadNews, 2000);
        } else {
            setState(states.ERROR);
            refreshBtn.disabled = false;
        }
    }
}

// Отображение новостей
function displayNews(news) {
    newsList.innerHTML = '';
    news.forEach(item => {
        const li = document.createElement('li');
        li.className = 'news-item';
        li.innerHTML = `
            <div class="news-title">${item.title}</div>
            <div class="news-date">${item.date}</div>
        `;
        newsList.appendChild(li);
    });
}

// Установка состояния интерфейса
function setState(state) {
    currentState = state;
    
    // Скрываем все состояния
    loadingState.classList.add('hidden');
    contentState.classList.add('hidden');
    errorState.classList.add('hidden');
    
    // Показываем нужное состояние
    switch(state) {
        case states.LOADING:
            loadingState.classList.remove('hidden');
            break;
        case states.CONTENT:
            contentState.classList.remove('hidden');
            break;
        case states.ERROR:
            errorState.classList.remove('hidden');
            break;
    }
}

// Обработчик кнопки обновления
refreshBtn.addEventListener('click', () => {
    retryCount = 0;
    loadNews();
});

// Загрузка при старте
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем кэш при загрузке
    caches.match(API_URL).then(response => {
        if (response) {
            response.json().then(data => {
                displayNews(data.news);
                setState(states.CONTENT);
            });
        } else {
            loadNews();
        }
    });
});

// Обработка онлайн/офлайн событий
window.addEventListener('online', () => {
    if (currentState === states.ERROR) {
        loadNews();
    }
});
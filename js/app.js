/**
 * Main Application Controller - SkyPulse Weather Application
 */

(function(window) {
  const StorageManager = window.StorageManager;
  const WeatherAPI = window.WeatherAPI;
  const ChartManager = window.ChartManager;
  const MapManager = window.MapManager;

  class App {
    constructor() {
      this.settings = StorageManager.getSettings();
      this.currentData = null;
      this.chartManager = new ChartManager();
      this.mapManager = new MapManager();
      this.activeTab = 'tab-home';

      this.init();
    }

    /**
     * Bootstrapping application logic
     */
    async init() {
      // 1. Apply persisted theme mode
      this.applyTheme(this.settings.theme);

      // 2. Start dynamic live clock
      this.startClock();

      // 3. Register Event Listeners
      this.setupNavigation();
      this.setupSearch();
      this.setupLocation();
      this.setupSettingsEvents();

      // 4. Initialize Leaflet Map
      this.mapManager.initMap('weather-map-container');

      // 5. Initial Weather Load (Geolocation or Default City)
      await this.loadInitialWeather();
    }

    /**
     * Start Live Digital Clock and Date Display
     */
    startClock() {
      const updateClock = () => {
        const now = new Date();
        const optionsDate = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        
        const dateStr = now.toLocaleDateString('en-US', optionsDate);
        const timeStr = now.toLocaleTimeString('en-US', optionsTime);

        const heroDateEl = document.getElementById('hero-date-str');
        const heroClockEl = document.getElementById('hero-clock');

        if (heroDateEl) heroDateEl.textContent = dateStr;
        if (heroClockEl) heroClockEl.textContent = timeStr;
      };

      updateClock();
      setInterval(updateClock, 1000);
    }

    /**
     * Load Initial Weather Data
     */
    async loadInitialWeather() {
      this.showLoader(true);
      let loaded = false;

      // Try HTML5 Geolocation API
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
          const data = await WeatherAPI.getWeatherData(coords, this.settings.apiKey);
          this.currentData = data;
          this.renderAll();
          loaded = true;
          this.showToast('Updated weather for your current GPS location', 'fa-location-dot');
        } catch (err) {
          console.log('Geolocation not granted or timed out, loading default city (New Delhi)');
        }
      }

      if (!loaded) {
        await this.fetchAndRenderCity('New Delhi');
      }

      this.showLoader(false);
    }

    /**
     * Fetch weather for a given city and trigger full UI render
     */
    async fetchAndRenderCity(cityName) {
      if (!cityName || !cityName.trim()) return;

      this.showLoader(true);
      try {
        const data = await WeatherAPI.getWeatherData(cityName.trim(), this.settings.apiKey);
        this.currentData = data;

        // Update Search History
        StorageManager.addHistory(data.city);

        this.renderAll();
        this.showToast(`Loaded weather for ${data.city}`, 'fa-cloud-sun');
      } catch (error) {
        console.error('Failed to fetch weather', error);
        this.showToast(`Error fetching weather for "${cityName}"`, 'fa-circle-exclamation');
      } finally {
        this.showLoader(false);
      }
    }

    /**
     * Primary Render Coordinator - Updates all 11 Views
     */
    renderAll() {
      if (!this.currentData) return;
      const d = this.currentData;
      const unit = this.settings.unit;
      const isLight = this.settings.theme === 'light';

      // Temperature formatting helper
      const formatTemp = (celsius) => {
        if (unit === 'F') {
          const f = Math.round((celsius * 9/5) + 32);
          return `${f}°F`;
        }
        return `${celsius}°C`;
      };

      // 1. HOME / DASHBOARD HERO
      document.getElementById('hero-city-name').textContent = d.city;
      document.getElementById('hero-country-name').textContent = d.country || '';
      document.getElementById('hero-temp').textContent = formatTemp(d.temp);
      document.getElementById('hero-condition').textContent = d.condition;
      document.getElementById('hero-feels-like').textContent = `Feels like ${formatTemp(d.feelsLike)}`;
      document.getElementById('hero-weather-desc').textContent = d.description;
      
      // Set animated icon URL
      const iconUrl = `https://openweathermap.org/img/wn/${d.icon}@4x.png`;
      document.getElementById('hero-weather-icon').src = iconUrl;

      // Quick Stats Cards
      document.getElementById('quick-humidity').textContent = `${d.humidity}%`;
      document.getElementById('quick-wind').textContent = `${d.windSpeed} km/h`;
      document.getElementById('quick-pressure').textContent = `${d.pressure} hPa`;
      document.getElementById('quick-visibility').textContent = `${d.visibility} km`;

      // Favourite Button State
      this.updateFavButtonState();

      // 2. CURRENT WEATHER VIEW
      document.getElementById('current-city-title').textContent = `${d.city}, ${d.country}`;
      document.getElementById('current-date-subtitle').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      document.getElementById('current-temp-val').textContent = formatTemp(d.temp);
      document.getElementById('current-cond-val').textContent = d.condition;
      document.getElementById('current-icon-img').src = iconUrl;
      document.getElementById('current-temp-range').textContent = `${formatTemp(d.tempMax)} / ${formatTemp(d.tempMin)}`;
      document.getElementById('current-feels-val').textContent = formatTemp(d.feelsLike);
      document.getElementById('current-sunrise').textContent = d.sunrise;
      document.getElementById('current-sunset').textContent = d.sunset;
      document.getElementById('current-uv').textContent = `${d.uvIndex} (${d.uvIndex > 7 ? 'Very High' : (d.uvIndex > 5 ? 'High' : 'Moderate')})`;

      // 3. HOURLY FORECAST VIEW
      const hourlyWrapper = document.getElementById('hourly-cards-wrapper');
      hourlyWrapper.innerHTML = d.hourly.map(item => `
        <div class="hourly-card">
          <div class="small text-muted mb-1">${item.time}</div>
          <img src="https://openweathermap.org/img/wn/${item.icon}.png" alt="icon" style="width: 42px;">
          <div class="fw-bold fs-5 my-1">${formatTemp(item.temp)}</div>
          <small class="text-info"><i class="fas fa-droplet text-cyan"></i> ${item.pop}%</small>
        </div>
      `).join('');

      this.chartManager.renderHourlyChart('chart-hourly', d.hourly, unit, isLight);

      // 4. 7-DAY FORECAST VIEW
      const weeklyWrapper = document.getElementById('weekly-cards-wrapper');
      weeklyWrapper.innerHTML = d.daily.map(item => `
        <div class="day-card">
          <div style="min-width: 80px;" class="fw-bold">${item.day}</div>
          <div class="d-flex align-items-center gap-2">
            <img src="https://openweathermap.org/img/wn/${item.icon}.png" alt="icon" style="width: 36px;">
            <small class="text-muted d-none d-sm-inline">${item.description}</small>
          </div>
          <div class="d-flex align-items-center gap-3">
            <span class="small text-muted">${formatTemp(item.minTemp)}</span>
            <div class="temp-bar-bg">
              <div class="temp-bar-fill" style="width: 80%;"></div>
            </div>
            <span class="fw-bold">${formatTemp(item.maxTemp)}</span>
          </div>
        </div>
      `).join('');

      this.chartManager.renderWeeklyChart('chart-weekly', d.daily, unit, isLight);

      // 5. AIR QUALITY (AQI) VIEW
      const aqi = d.aqi;
      document.getElementById('aqi-value-num').textContent = aqi.value;
      const badgeEl = document.getElementById('aqi-status-badge');
      badgeEl.textContent = aqi.status.label;
      badgeEl.className = `aqi-badge aqi-bg-${aqi.status.code} fs-5`;

      document.getElementById('aqi-pm25').textContent = `${aqi.pm2_5} µg/m³`;
      document.getElementById('aqi-pm10').textContent = `${aqi.pm10} µg/m³`;
      document.getElementById('aqi-co').textContent = `${aqi.co} µg/m³`;
      document.getElementById('aqi-no2').textContent = `${aqi.no2} µg/m³`;
      document.getElementById('aqi-o3').textContent = `${aqi.o3} µg/m³`;

      // Progress bar width helpers
      document.getElementById('bar-pm25').style.width = `${Math.min(100, (aqi.pm2_5 / 75) * 100)}%`;
      document.getElementById('bar-pm10').style.width = `${Math.min(100, (aqi.pm10 / 150) * 100)}%`;
      document.getElementById('bar-co').style.width = `${Math.min(100, (aqi.co / 1000) * 100)}%`;
      document.getElementById('bar-no2').style.width = `${Math.min(100, (aqi.no2 / 200) * 100)}%`;
      document.getElementById('bar-o3').style.width = `${Math.min(100, (aqi.o3 / 180) * 100)}%`;

      // 6. WEATHER DETAILS EXTENDED VIEW
      document.getElementById('detail-humidity').textContent = `${d.humidity}%`;
      document.getElementById('detail-dewpoint').textContent = `Dew point: ${formatTemp(d.dewPoint)}`;
      document.getElementById('detail-windspeed').textContent = `${d.windSpeed} km/h`;
      document.getElementById('detail-winddeg').textContent = `${d.windDeg}° Direction`;
      document.getElementById('detail-compass').style.transform = `rotate(${d.windDeg}deg)`;
      document.getElementById('detail-pressure').textContent = `${d.pressure} hPa`;
      document.getElementById('detail-visibility').textContent = `${d.visibility} km`;
      document.getElementById('detail-clouds').textContent = `${d.cloudCover}%`;
      document.getElementById('detail-dewval').textContent = formatTemp(d.dewPoint);

      // 7. INTERACTIVE MAP VIEW
      this.mapManager.updateLocation(d.coords.lat, d.coords.lon, d.city, d.temp, d.condition);

      // 8. FAVOURITE CITIES VIEW
      this.renderFavouritesView();

      // 9. SEARCH HISTORY VIEW
      this.renderHistoryView();
    }

    /**
     * Render Favourite Cities Grid
     */
    renderFavouritesView() {
      const container = document.getElementById('fav-cities-grid');
      if (!container) return;

      const favs = StorageManager.getFavourites();
      if (favs.length === 0) {
        container.innerHTML = `
          <div class="col-12 text-center py-5 text-muted">
            <i class="far fa-heart fs-1 mb-3"></i>
            <p>No favourite cities saved yet. Search a city and click "Add to Favourites"!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = favs.map(city => `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="fav-city-card" data-city="${city}">
            <button class="fav-remove-btn" data-remove="${city}" title="Remove Favourite">
              <i class="fas fa-xmark fs-5"></i>
            </button>
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <h5 class="fw-bold mb-1">${city}</h5>
                <small class="text-info">Saved Location</small>
              </div>
              <div class="text-end">
                <i class="fas fa-cloud-sun fs-2 text-info"></i>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.fav-city-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const removeTarget = e.target.closest('[data-remove]');
          if (removeTarget) {
            const cityToRemove = removeTarget.getAttribute('data-remove');
            StorageManager.removeFavourite(cityToRemove);
            this.updateFavButtonState();
            this.renderFavouritesView();
            this.showToast(`Removed ${cityToRemove} from favourites`, 'fa-trash');
          } else {
            const targetCity = card.getAttribute('data-city');
            this.fetchAndRenderCity(targetCity);
            this.switchTab('tab-home');
          }
        });
      });
    }

    /**
     * Render Recent Search History Chips
     */
    renderHistoryView() {
      const container = document.getElementById('history-chips-container');
      if (!container) return;

      const history = StorageManager.getHistory();
      if (history.length === 0) {
        container.innerHTML = `<p class="text-muted mb-0">No recent search history.</p>`;
        return;
      }

      container.innerHTML = history.map(city => `
        <div class="history-chip" data-city="${city}">
          <i class="fas fa-clock-rotate-left text-info"></i>
          <span>${city}</span>
        </div>
      `).join('');

      container.querySelectorAll('.history-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const city = chip.getAttribute('data-city');
          this.fetchAndRenderCity(city);
          this.switchTab('tab-home');
        });
      });
    }

    /**
     * Update Favourite Toggle Button on Home Hero
     */
    updateFavButtonState() {
      if (!this.currentData) return;
      const isFav = StorageManager.isFavourite(this.currentData.city);
      const iconEl = document.getElementById('hero-fav-icon');
      const labelEl = document.getElementById('hero-fav-label');

      if (iconEl && labelEl) {
        if (isFav) {
          iconEl.className = 'fas fa-heart text-danger';
          labelEl.textContent = 'Saved in Favourites';
        } else {
          iconEl.className = 'far fa-heart';
          labelEl.textContent = 'Add to Favourites';
        }
      }
    }

    /**
     * Setup Navigation Tabs
     */
    setupNavigation() {
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabId = btn.getAttribute('data-tab');
          this.switchTab(tabId);
        });
      });

      document.getElementById('nav-brand')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('tab-home');
      });

      document.querySelectorAll('#map-layer-controls button').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#map-layer-controls button').forEach(b => b.classList.remove('glass-btn-active'));
          btn.classList.add('glass-btn-active');
          const layer = btn.getAttribute('data-layer');
          this.mapManager.setLayer(layer, this.settings.apiKey);
        });
      });
    }

    switchTab(tabId) {
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      document.querySelectorAll('.tab-content-section').forEach(sec => {
        if (sec.id === tabId) {
          sec.classList.remove('d-none');
          sec.classList.add('active');
        } else {
          sec.classList.add('d-none');
          sec.classList.remove('active');
        }
      });

      this.activeTab = tabId;

      if (tabId === 'tab-map' && this.currentData) {
        setTimeout(() => {
          this.mapManager.updateLocation(
            this.currentData.coords.lat,
            this.currentData.coords.lon,
            this.currentData.city,
            this.currentData.temp,
            this.currentData.condition
          );
        }, 200);
      }
    }

    /**
     * Setup Search Bar Event Listeners
     */
    setupSearch() {
      const input = document.getElementById('input-city-search');
      const searchBtn = document.getElementById('btn-search-city');

      const executeSearch = () => {
        const city = input.value;
        if (city) {
          this.fetchAndRenderCity(city);
          input.value = '';
        }
      };

      searchBtn?.addEventListener('click', executeSearch);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeSearch();
      });

      document.getElementById('btn-fav-toggle')?.addEventListener('click', () => {
        if (!this.currentData) return;
        const city = this.currentData.city;
        if (StorageManager.isFavourite(city)) {
          StorageManager.removeFavourite(city);
          this.showToast(`Removed ${city} from favourites`, 'fa-trash');
        } else {
          StorageManager.addFavourite(city);
          this.showToast(`Added ${city} to favourites!`, 'fa-heart');
        }
        this.updateFavButtonState();
        this.renderFavouritesView();
      });
    }

    /**
     * Setup Geolocation Button
     */
    setupLocation() {
      document.getElementById('btn-current-location')?.addEventListener('click', () => {
        this.loadInitialWeather();
      });
    }

    /**
     * Setup Settings Page Controls
     */
    setupSettingsEvents() {
      const themeSwitch = document.getElementById('switch-theme');
      const themeBtn = document.getElementById('btn-theme-toggle');

      const toggleThemeMode = () => {
        const newTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.settings = StorageManager.saveSettings({ theme: newTheme });
        this.renderAll();
        this.showToast(`Theme set to ${newTheme} mode`, newTheme === 'dark' ? 'fa-moon' : 'fa-sun');
      };

      themeSwitch?.addEventListener('change', toggleThemeMode);
      themeBtn?.addEventListener('click', toggleThemeMode);

      const unitToggleBtn = document.getElementById('btn-unit-toggle');
      const unitCBtn = document.getElementById('unit-c-btn');
      const unitFBtn = document.getElementById('unit-f-btn');

      const setUnit = (unit) => {
        this.settings = StorageManager.saveSettings({ unit });
        document.getElementById('unit-label').textContent = `°${unit}`;
        this.renderAll();
        this.showToast(`Temperature unit changed to °${unit}`, 'fa-temperature-three-quarters');
      };

      unitToggleBtn?.addEventListener('click', () => {
        const nextUnit = this.settings.unit === 'C' ? 'F' : 'C';
        setUnit(nextUnit);
      });
      unitCBtn?.addEventListener('click', () => setUnit('C'));
      unitFBtn?.addEventListener('click', () => setUnit('F'));

      const apiKeyInput = document.getElementById('input-api-key');
      const saveKeyBtn = document.getElementById('btn-save-key');

      if (apiKeyInput) apiKeyInput.value = this.settings.apiKey || '';

      saveKeyBtn?.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        this.settings = StorageManager.saveSettings({ apiKey: key });
        this.showToast('API Key updated successfully', 'fa-key');
        if (this.currentData) this.fetchAndRenderCity(this.currentData.city);
      });

      document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        StorageManager.clearHistory();
        this.renderHistoryView();
        this.showToast('Search history cleared', 'fa-trash');
      });
    }

    applyTheme(theme) {
      const isLight = theme === 'light';
      if (isLight) {
        document.body.classList.add('light-mode');
      } else {
        document.body.classList.remove('light-mode');
      }

      const switchEl = document.getElementById('switch-theme');
      const themeIcon = document.getElementById('theme-icon');

      if (switchEl) switchEl.checked = isLight;
      if (themeIcon) themeIcon.className = isLight ? 'fas fa-sun text-warning' : 'fas fa-moon text-info';
    }

    showLoader(visible) {
      const loader = document.getElementById('app-loader');
      if (loader) {
        if (visible) loader.classList.remove('d-none');
        else loader.classList.add('d-none');
      }
    }

    showToast(message, iconClass = 'fa-info-circle') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast-custom';
      toast.innerHTML = `
        <i class="fas ${iconClass} text-info"></i>
        <span>${message}</span>
      `;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
      }, 3000);
    }
  }

  window.App = App;

  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
})(window);

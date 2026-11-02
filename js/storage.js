/**
 * Storage Manager Module - Handles LocalStorage persistence
 */

(function(window) {
  const STORAGE_KEYS = {
    FAVOURITES: 'weather_app_favourites_v2',
    HISTORY: 'weather_app_history_v2',
    SETTINGS: 'weather_app_settings_v2'
  };

  const DEFAULT_SETTINGS = {
    theme: 'dark',        // 'dark' | 'light'
    unit: 'C',           // 'C' | 'F'
    lang: 'en',          // 'en' | 'es' | 'fr' | 'de' | 'hi'
    apiKey: ''           // Optional OpenWeatherMap API Key
  };

  class StorageManager {
    static getSettings() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
      } catch (e) {
        console.error('Error reading settings from localStorage', e);
        return { ...DEFAULT_SETTINGS };
      }
    }

    static saveSettings(settings) {
      try {
        const current = this.getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        return updated;
      } catch (e) {
        console.error('Error saving settings to localStorage', e);
      }
    }

    static getFavourites() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
        return data ? JSON.parse(data) : ['London', 'New York', 'Tokyo', 'Mumbai', 'Paris'];
      } catch (e) {
        console.error('Error reading favourites from localStorage', e);
        return ['London', 'New York', 'Tokyo', 'Mumbai', 'Paris'];
      }
    }

    static addFavourite(cityName) {
      if (!cityName) return;
      const favs = this.getFavourites();
      const formatted = cityName.trim();
      if (!favs.some(c => c.toLowerCase() === formatted.toLowerCase())) {
        favs.unshift(formatted);
        localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(favs));
      }
      return favs;
    }

    static removeFavourite(cityName) {
      let favs = this.getFavourites();
      favs = favs.filter(c => c.toLowerCase() !== cityName.trim().toLowerCase());
      localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(favs));
      return favs;
    }

    static isFavourite(cityName) {
      if (!cityName) return false;
      const favs = this.getFavourites();
      return favs.some(c => c.toLowerCase() === cityName.trim().toLowerCase());
    }

    static getHistory() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return data ? JSON.parse(data) : ['New Delhi', 'London', 'Sydney', 'Dubai'];
      } catch (e) {
        console.error('Error reading history from localStorage', e);
        return ['New Delhi', 'London', 'Sydney', 'Dubai'];
      }
    }

    static addHistory(cityName) {
      if (!cityName) return;
      let history = this.getHistory();
      const formatted = cityName.trim();
      history = history.filter(c => c.toLowerCase() !== formatted.toLowerCase());
      history.unshift(formatted);
      if (history.length > 10) history = history.slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return history;
    }

    static clearHistory() {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
      return [];
    }
  }

  window.StorageManager = StorageManager;
})(window);

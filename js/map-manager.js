/**
 * Map Manager Module - Interactive Leaflet Weather Map Integration
 */

(function(window) {
  class MapManager {
    constructor() {
      this.map = null;
      this.marker = null;
      this.activeLayer = 'clouds_new';
      this.weatherTileLayer = null;
    }

    /**
     * Initialize Leaflet Map in target container ID
     */
    initMap(containerId, lat = 28.6139, lon = 77.2090, cityName = 'New Delhi') {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      try {
        // Initialize Leaflet Map centered on target lat/lon
        this.map = L.map(containerId, {
          center: [lat, lon],
          zoom: 10,
          zoomControl: true
        });

        // Dark/Modern OpenStreetMap tiles (CartoDB Dark Matter base tile)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(this.map);

        // Custom glowing weather marker icon
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div style="
            background: #0284c7;
            color: #fff;
            border: 2px solid #38bdf8;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.8);
          "><i class="fas fa-location-dot"></i></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        this.marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
        this.marker.bindPopup(`<b>${cityName}</b><br>Weather Center`).openPopup();

        setTimeout(() => {
          if (this.map) this.map.invalidateSize();
        }, 400);
      } catch (err) {
        console.warn('Leaflet map initialization error', err);
      }
    }

    /**
     * Update map view to new location
     */
    updateLocation(lat, lon, cityName, temp, condition) {
      if (!this.map) return;
      try {
        this.map.setView([lat, lon], 10, { animate: true, duration: 1 });

        if (this.marker) {
          this.marker.setLatLng([lat, lon]);
          this.marker.setPopupContent(`
            <div style="font-family: sans-serif; text-align: center;">
              <strong style="color: #0284c7; font-size: 1rem;">${cityName}</strong><br>
              <span style="font-size: 1.1rem; font-weight: bold;">${temp}°C</span> - ${condition}
            </div>
          `);
        }

        setTimeout(() => {
          if (this.map) this.map.invalidateSize();
        }, 300);
      } catch (e) {
        console.warn('Map update location error', e);
      }
    }

    /**
     * Switch Weather Map Layer (Rain, Clouds, Temp, Wind)
     */
    setLayer(layerName, apiKey = 'bd5e378503939ddaee76f12ad7a97608') {
      if (!this.map) return;

      if (this.weatherTileLayer) {
        this.map.removeLayer(this.weatherTileLayer);
      }

      let layerType = 'clouds_new';
      switch (layerName) {
        case 'rain': layerType = 'precipitation_new'; break;
        case 'temp': layerType = 'temp_new'; break;
        case 'wind': layerType = 'wind_new'; break;
        case 'clouds': default: layerType = 'clouds_new'; break;
      }

      this.weatherTileLayer = L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${apiKey}`, {
        opacity: 0.65,
        maxZoom: 18
      });

      this.weatherTileLayer.addTo(this.map);
      this.activeLayer = layerName;
    }
  }

  window.MapManager = MapManager;
})(window);

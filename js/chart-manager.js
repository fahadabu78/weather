/**
 * Chart Manager Module - Handles Chart.js chart initializations and updates
 */

(function(window) {
  class ChartManager {
    constructor() {
      this.hourlyChartInstance = null;
      this.weeklyChartInstance = null;
    }

    /**
     * Render or update the 24-Hour Forecast Chart
     */
    renderHourlyChart(canvasId, hourlyData, unit = 'C', isLightMode = false) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (this.hourlyChartInstance) {
        this.hourlyChartInstance.destroy();
      }

      const textColor = isLightMode ? '#0f172a' : '#f8fafc';
      const gridColor = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

      const labels = hourlyData.map(item => item.time);
      const temps = hourlyData.map(item => unit === 'F' ? Math.round((item.temp * 9/5) + 32) : item.temp);
      const pops = hourlyData.map(item => item.pop);

      // Create subtle gradient fill for temperature
      const tempGradient = ctx.createLinearGradient(0, 0, 0, 300);
      tempGradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
      tempGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      this.hourlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: `Temperature (°${unit})`,
              data: temps,
              borderColor: '#38bdf8',
              backgroundColor: tempGradient,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#38bdf8',
              yAxisID: 'y'
            },
            {
              label: 'Rain Chance (%)',
              data: pops,
              type: 'bar',
              backgroundColor: 'rgba(99, 102, 241, 0.4)',
              borderColor: '#6366f1',
              borderWidth: 1,
              borderRadius: 6,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textColor, font: { family: 'Outfit', size: 12 } }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              titleColor: '#38bdf8',
              bodyColor: '#ffffff',
              cornerRadius: 10
            }
          },
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            y: {
              type: 'linear',
              position: 'left',
              ticks: { color: textColor },
              grid: { color: gridColor },
              title: { display: true, text: `Temp (°${unit})`, color: textColor }
            },
            y1: {
              type: 'linear',
              position: 'right',
              min: 0,
              max: 100,
              ticks: { color: textColor },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Rain (%)', color: textColor }
            }
          }
        }
      });
    }

    /**
     * Render or update the 7-Day Min vs Max Temperature Chart
     */
    renderWeeklyChart(canvasId, dailyData, unit = 'C', isLightMode = false) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (this.weeklyChartInstance) {
        this.weeklyChartInstance.destroy();
      }

      const textColor = isLightMode ? '#0f172a' : '#f8fafc';
      const gridColor = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

      const labels = dailyData.map(item => item.day);
      const minTemps = dailyData.map(item => unit === 'F' ? Math.round((item.minTemp * 9/5) + 32) : item.minTemp);
      const maxTemps = dailyData.map(item => unit === 'F' ? Math.round((item.maxTemp * 9/5) + 32) : item.maxTemp);

      this.weeklyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: `Max Temp (°${unit})`,
              data: maxTemps,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 3,
              fill: '+1',
              tension: 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#f59e0b'
            },
            {
              label: `Min Temp (°${unit})`,
              data: minTemps,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#38bdf8'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textColor, font: { family: 'Outfit', size: 12 } }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              titleColor: '#f59e0b',
              bodyColor: '#ffffff',
              cornerRadius: 10
            }
          },
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
              title: { display: true, text: `Temperature (°${unit})`, color: textColor }
            }
          }
        }
      });
    }
  }

  window.ChartManager = ChartManager;
})(window);

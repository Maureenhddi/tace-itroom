import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

interface MonthlyData {
  month: string;
  realRate: number;
  estimatedRate: number;
}

@Component({
  selector: 'app-monthly-activity-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-activity-chart.component.html',
  styleUrl: './monthly-activity-chart.component.scss'
})
export class MonthlyActivityChartComponent implements OnInit, OnDestroy {
  @Input() monthlyData: MonthlyData[] = [];
  @Input() title: string = 'Évolution du Taux d\'Activité Total';

  private chart: Chart | null = null;
  private isBrowser: boolean;
  chartId: string;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.chartId = `monthlyActivityChart-${Math.random().toString(36).substring(2, 11)}`;
  }

  ngOnInit(): void {
    if (this.isBrowser && this.monthlyData.length > 0) {
      setTimeout(() => this.createChart(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    const canvas = document.getElementById(this.chartId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extraire les labels et les données
    const labels = this.monthlyData.map(d => d.month);
    const realRates = this.monthlyData.map(d => d.realRate);
    const estimatedRates = this.monthlyData.map(d => d.estimatedRate);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Taux d\'activité réel (hors prévision)',
            data: realRates,
            borderColor: '#bd5ccaff',
            backgroundColor: 'rgba(30, 135, 240, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#bd5ccaff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          },
          {
            label: 'Taux d\'activité estimé (prévision inclus)',
            data: estimatedRates,
            borderColor: '#8bf8a4ff',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#8bf8a4ff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 13,
                weight: 'bold'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${value !== null ? value.toFixed(1) : '0'} %`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value} %`,
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 12
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }
}

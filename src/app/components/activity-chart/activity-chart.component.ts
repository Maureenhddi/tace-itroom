import { Component, Input, OnInit, OnChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DailyMetrics, ActivityRateService } from '../../services/activity-rate.service';

@Component({
  selector: 'app-activity-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './activity-chart.component.html',
  styleUrl: './activity-chart.component.scss'
})
export class ActivityChartComponent implements OnInit, OnChanges {
  @Input() dailyMetrics: DailyMetrics[] = [];
  @Input() chartType: 'expertise' | 'ecommerce-teams' | 'surmesure-teams' = 'expertise';
  @Input() title: string = '';

  insights: string[] = [];

  constructor(private activityRateService: ActivityRateService) {}

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public lineChartType: ChartType = 'line';

  ngOnInit() {
    this.updateChartData();
  }

  ngOnChanges() {
    this.updateChartData();
  }

  private updateChartData() {
    if (!this.dailyMetrics || this.dailyMetrics.length === 0) {
      return;
    }

    // Agréger les données par jour complet (moyenne matin + après-midi)
    const aggregatedData = this.activityRateService.aggregateDailyMetrics(this.dailyMetrics);

    // Labels = dates agrégées
    this.lineChartData.labels = aggregatedData.map(d => d.date);

    if (this.chartType === 'expertise') {
      // Graphique 1 : E-commerce vs Sur mesure (global)
      const ecommerceData = aggregatedData.map(d => d.ecommerceRate);
      const surMesureData = aggregatedData.map(d => d.surMesureRate);

      this.lineChartData.datasets = [
        this.createDataset(ecommerceData, 'E-commerce', '#1e87f0'),
        this.createDataset(surMesureData, 'Sur mesure', '#f59c16')
      ];

      this.insights = this.generateExpertiseInsights(ecommerceData, surMesureData);
    } else if (this.chartType === 'ecommerce-teams') {
      // Graphique 2 : E-commerce Front vs Back
      const ecommerceFrontData = aggregatedData.map(d => d.ecommerceFrontRate);
      const ecommerceBackData = aggregatedData.map(d => d.ecommerceBackRate);

      this.lineChartData.datasets = [
        this.createDataset(ecommerceFrontData, 'E-commerce Front', '#1e87f0'),
        this.createDataset(ecommerceBackData, 'E-commerce Back', '#f59c16')
      ];

      this.insights = this.generateTeamInsights('E-commerce', ecommerceFrontData, ecommerceBackData);
    } else if (this.chartType === 'surmesure-teams') {
      // Graphique 3 : Sur mesure Front vs Back
      const surMesureFrontData = aggregatedData.map(d => d.surMesureFrontRate);
      const surMesureBackData = aggregatedData.map(d => d.surMesureBackRate);

      this.lineChartData.datasets = [
        this.createDataset(surMesureFrontData, 'Sur mesure Front', '#1e87f0'),
        this.createDataset(surMesureBackData, 'Sur mesure Back', '#f59c16')
      ];

      this.insights = this.generateTeamInsights('Sur mesure', surMesureFrontData, surMesureBackData);
    }

    this.chart?.update();
  }

  /**
   * Crée un dataset Chart.js avec les paramètres communs
   */
  private createDataset(data: number[], label: string, color: string) {
    return {
      data,
      label,
      borderColor: color,
      backgroundColor: this.hexToRgba(color, 0.1),
      fill: true,
      tension: 0.4
    };
  }

  /**
   * Convertit une couleur hex en rgba avec une opacité donnée
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Génère des insights pour le graphique expertise (E-commerce vs Sur mesure)
   */
  private generateExpertiseInsights(ecommerceData: number[], surMesureData: number[]): string[] {
    const insights: string[] = [];

    // Calculer les moyennes
    const avgEcommerce = this.calculateAverage(ecommerceData);
    const avgSurMesure = this.calculateAverage(surMesureData);

    // Calculer la disponibilité (inverse du taux d'activité)
    const availEcommerce = 100 - avgEcommerce;
    const availSurMesure = 100 - avgSurMesure;

    if (availEcommerce > availSurMesure) {
      const diff = Math.round((availEcommerce - availSurMesure) * 10) / 10;
      insights.push(`L'équipe E-commerce dispose de ${diff}% de disponibilité supplémentaire en moyenne`);
    } else if (availSurMesure > availEcommerce) {
      const diff = Math.round((availSurMesure - availEcommerce) * 10) / 10;
      insights.push(`L'équipe sur mesure dispose de ${diff}% de disponibilité supplémentaire en moyenne`);
    }

    // Taux d'activité moyen
    if (avgEcommerce > avgSurMesure) {
      insights.push(`L'équipe E-commerce a un taux d'activité moyen de ${Math.round(avgEcommerce * 10) / 10}%`);
    } else {
      insights.push(`L'équipe Sur mesure a un taux d'activité moyen de ${Math.round(avgSurMesure * 10) / 10}%`);
    }

    return insights;
  }

  /**
   * Génère des insights pour les graphiques équipes (Front vs Back)
   */
  private generateTeamInsights(expertise: string, frontData: number[], backData: number[]): string[] {
    const insights: string[] = [];

    // Calculer les moyennes
    const avgFront = this.calculateAverage(frontData);
    const avgBack = this.calculateAverage(backData);

    // Calculer la disponibilité (inverse du taux d'activité)
    const availFront = 100 - avgFront;
    const availBack = 100 - avgBack;

    // Insight sur la disponibilité
    if (availBack > availFront) {
      const diff = Math.round((availBack - availFront) * 10) / 10;
      insights.push(`L'équipe Back ${expertise} ayant le plus de disponibilité (+${diff}% en moyenne)`);
    } else if (availFront > availBack) {
      const diff = Math.round((availFront - availBack) * 10) / 10;
      insights.push(`L'équipe Front ${expertise} ayant le plus de disponibilité (+${diff}% en moyenne)`);
    }

    // Insight sur le taux d'activité
    if (avgFront > avgBack) {
      insights.push(`L'équipe Front ${expertise} avec un taux d'activité moyen de ${Math.round(avgFront * 10) / 10}%`);
    } else {
      insights.push(`L'équipe Back ${expertise} avec un taux d'activité moyen de ${Math.round(avgBack * 10) / 10}%`);
    }

    return insights;
  }

  /**
   * Calcule la moyenne d'un tableau de nombres
   */
  private calculateAverage(data: number[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }
}

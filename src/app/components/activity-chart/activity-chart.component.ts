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

  private readonly COLORS = {
    PRIMARY: '#1e87f0',
    SECONDARY: '#f59c16'
  } as const;

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

    // Les données sont déjà agrégées par jour complet depuis consolidateAllDailyMetrics()
    this.lineChartData.labels = this.dailyMetrics.map(d => d.date);

    // Calculer les taux d'activité pour chaque jour
    const chartData = this.calculateChartData();

    // Créer les datasets avec les couleurs définies
    this.lineChartData.datasets = [
      this.createDataset(chartData.data1, chartData.label1, this.COLORS.PRIMARY),
      this.createDataset(chartData.data2, chartData.label2, this.COLORS.SECONDARY)
    ];

    // Générer les insights en fonction du type de graphique
    if (this.chartType === 'expertise') {
      this.insights = this.generateExpertiseInsights(chartData.data1, chartData.data2);
    } else if (this.chartType === 'ecommerce-teams') {
      this.insights = this.generateTeamInsights('E-commerce', chartData.data1, chartData.data2);
    } else if (this.chartType === 'surmesure-teams') {
      this.insights = this.generateTeamInsights('Sur mesure', chartData.data1, chartData.data2);
    }

    this.chart?.update();
  }

  /**
   * Calcule les données du graphique en fonction du type
   */
  private calculateChartData(): { data1: number[], data2: number[], label1: string, label2: string } {
    if (this.chartType === 'expertise') {
      return {
        data1: this.dailyMetrics.map(d => this.activityRateService.calculateEcommerceActivityRate(d)),
        data2: this.dailyMetrics.map(d => this.activityRateService.calculateSurMesureActivityRate(d)),
        label1: 'E-commerce',
        label2: 'Sur mesure'
      };
    } else if (this.chartType === 'ecommerce-teams') {
      return {
        data1: this.dailyMetrics.map(d => this.activityRateService.calculateEcommerceFrontActivityRate(d)),
        data2: this.dailyMetrics.map(d => this.activityRateService.calculateEcommerceBackActivityRate(d)),
        label1: 'E-commerce Front',
        label2: 'E-commerce Back'
      };
    } else { // surmesure-teams
      return {
        data1: this.dailyMetrics.map(d => this.activityRateService.calculateSurMesureFrontActivityRate(d)),
        data2: this.dailyMetrics.map(d => this.activityRateService.calculateSurMesureBackActivityRate(d)),
        label1: 'Sur mesure Front',
        label2: 'Sur mesure Back'
      };
    }
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

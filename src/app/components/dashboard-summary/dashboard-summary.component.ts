import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MonthlyActivityChartComponent } from '../monthly-activity-chart/monthly-activity-chart.component';
import { ProjectStatistics } from '../../services/activity-rate.service';

export interface MonthlySummary {
  month: string;
  totalMetrics: {
    realRate: number;
    estimatedRate: number;
  };
  teamMetrics: {
    frontRate: number;
    backRate: number;
  };
  expertiseMetrics: {
    ecommerceRate: number;
    surMesureRate: number;
  };
  projects: string[]; // Liste des projets du mois
  projectStats: ProjectStatistics[]; // Statistiques détaillées par projet
}

@Component({
  selector: 'app-dashboard-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTooltipModule, MonthlyActivityChartComponent],
  templateUrl: './dashboard-summary.component.html',
  styleUrl: './dashboard-summary.component.scss'
})
export class DashboardSummaryComponent {
  @Input() monthlySummaries: MonthlySummary[] = [];

  /**
   * Transforme les monthlySummaries en données pour le graphique
   */
  get monthlyChartData() {
    return this.monthlySummaries.map(summary => ({
      month: summary.month,
      realRate: summary.totalMetrics.realRate,
      estimatedRate: summary.totalMetrics.estimatedRate
    }));
  }

  /**
   * Retourne la classe CSS en fonction du taux d'activité
   * - good: >= 85%
   * - average: 70% - 84%
   * - low: < 70%
   */
  getRateClass(rate: number): string {
    if (rate >= 85) return 'rate-good';
    if (rate >= 70) return 'rate-average';
    return 'rate-low';
  }
}

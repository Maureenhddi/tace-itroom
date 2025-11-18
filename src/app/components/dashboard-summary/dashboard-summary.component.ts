import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivityChartComponent } from '../activity-chart/activity-chart.component';
import { ProjectStatistics, DailyMetrics } from '../../services/activity-rate.service';

export interface MonthlySummary {
  month: string;
  totalMetrics: {
    realRate: number;
    estimatedRate: number;
  };
  specificTeamMetrics: {
    frontEcommerceRate: number;
    backEcommerceRate: number;
    frontSurMesureRate: number;
    backSurMesureRate: number;
  };
  projects: string[]; // Liste des projets du mois
  projectStats: ProjectStatistics[]; // Statistiques détaillées par projet
}

@Component({
  selector: 'app-dashboard-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTooltipModule, ActivityChartComponent],
  templateUrl: './dashboard-summary.component.html',
  styleUrl: './dashboard-summary.component.scss'
})
export class DashboardSummaryComponent {
  @Input() monthlySummaries: MonthlySummary[] = [];
  @Input() consolidatedDailyMetrics: DailyMetrics[] = [];

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

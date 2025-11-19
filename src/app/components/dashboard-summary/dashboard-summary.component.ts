import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivityChartComponent } from '../activity-chart/activity-chart.component';
import { AlertsPanelComponent } from '../alerts-panel/alerts-panel.component';
import { ExportService } from '../../services/export.service';
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
  // Comparaison avec le mois précédent
  trends?: {
    realRateTrend: number; // Différence en points de pourcentage
    estimatedRateTrend: number;
    frontEcommerceTrend: number;
    backEcommerceTrend: number;
    frontSurMesureTrend: number;
    backSurMesureTrend: number;
  };
}

@Component({
  selector: 'app-dashboard-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTooltipModule, MatIconModule, MatButtonModule, ActivityChartComponent, AlertsPanelComponent],
  templateUrl: './dashboard-summary.component.html',
  styleUrl: './dashboard-summary.component.scss'
})
export class DashboardSummaryComponent {
  @Input() monthlySummaries: MonthlySummary[] = [];
  @Input() consolidatedDailyMetrics: DailyMetrics[] = [];

  constructor(private exportService: ExportService) {}

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

  /**
   * Retourne la classe CSS pour la tendance
   */
  getTrendClass(trend: number): string {
    if (trend > 0) return 'trend-positive';
    if (trend < 0) return 'trend-negative';
    return 'trend-neutral';
  }

  /**
   * Formate l'affichage de la tendance avec signe + ou -
   */
  formatTrend(trend: number): string {
    if (trend === 0) return '0%';
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  }

  /**
   * Retourne l'icône Material pour la tendance
   */
  getTrendIcon(trend: number): string {
    if (trend > 0) return 'trending_up';
    if (trend < 0) return 'trending_down';
    return 'trending_flat';
  }

  /**
   * Exporte le dashboard vers Excel
   */
  exportToExcel(): void {
    this.exportService.exportDashboardToExcel(this.monthlySummaries);
  }
}

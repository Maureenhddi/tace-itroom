import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

export interface MonthlySummary {
  month: string;
  teamMetrics: {
    frontRate: number;
    backRate: number;
  };
  expertiseMetrics: {
    ecommerceRate: number;
    surMesureRate: number;
  };
}

@Component({
  selector: 'app-dashboard-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './dashboard-summary.component.html',
  styleUrl: './dashboard-summary.component.scss'
})
export class DashboardSummaryComponent {
  @Input() monthlySummaries: MonthlySummary[] = [];

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

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MonthlySummary } from '../dashboard-summary/dashboard-summary.component';

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  month: string;
  metric?: string;
  value?: number;
  icon: string;
}

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule],
  templateUrl: './alerts-panel.component.html',
  styleUrl: './alerts-panel.component.scss'
})
export class AlertsPanelComponent implements OnInit {
  @Input() monthlySummaries: MonthlySummary[] = [];

  alerts: Alert[] = [];

  // Seuils d'alerte
  private readonly CRITICAL_THRESHOLD = 70;  // < 70% = critique
  private readonly WARNING_THRESHOLD = 85;   // < 85% = avertissement
  private readonly TREND_WARNING_THRESHOLD = -5; // Baisse de > 5% = avertissement

  ngOnInit() {
    this.generateAlerts();
  }

  ngOnChanges() {
    this.generateAlerts();
  }

  /**
   * Génère les alertes basées sur les données mensuelles
   */
  private generateAlerts() {
    this.alerts = [];

    // Vérifier le mois le plus récent (dernier dans la liste)
    if (this.monthlySummaries.length === 0) return;

    const currentMonth = this.monthlySummaries[this.monthlySummaries.length - 1];

    // Alerte pour taux global
    this.checkRate(
      currentMonth.month,
      'Taux global réel',
      currentMonth.totalMetrics.realRate,
      currentMonth.trends?.realRateTrend
    );

    // Alertes pour équipes spécifiques
    this.checkRate(
      currentMonth.month,
      'Front E-commerce',
      currentMonth.specificTeamMetrics.frontEcommerceRate,
      currentMonth.trends?.frontEcommerceTrend
    );

    this.checkRate(
      currentMonth.month,
      'Back E-commerce',
      currentMonth.specificTeamMetrics.backEcommerceRate,
      currentMonth.trends?.backEcommerceTrend
    );

    this.checkRate(
      currentMonth.month,
      'Front Sur mesure',
      currentMonth.specificTeamMetrics.frontSurMesureRate,
      currentMonth.trends?.frontSurMesureTrend
    );

    this.checkRate(
      currentMonth.month,
      'Back Sur mesure',
      currentMonth.specificTeamMetrics.backSurMesureRate,
      currentMonth.trends?.backSurMesureTrend
    );

    // Vérifier les tendances négatives sur plusieurs mois
    this.checkNegativeTrends();

    // Ajouter des insights positifs si aucune alerte
    if (this.alerts.length === 0) {
      this.alerts.push({
        type: 'info',
        title: 'Excellentes performances',
        message: `Tous les taux d'activité de ${currentMonth.month} sont au-dessus des seuils recommandés.`,
        month: currentMonth.month,
        icon: 'celebration'
      });
    }

    // Trier par priorité (critical > warning > info)
    this.alerts.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }

  /**
   * Vérifie un taux et génère une alerte si nécessaire
   */
  private checkRate(month: string, metricName: string, rate: number, trend?: number) {
    // Alerte critique
    if (rate < this.CRITICAL_THRESHOLD) {
      this.alerts.push({
        type: 'critical',
        title: `${metricName} critique`,
        message: `Le taux de ${metricName} est de ${rate.toFixed(1)}%, bien en dessous du seuil recommandé de ${this.CRITICAL_THRESHOLD}%.`,
        month,
        metric: metricName,
        value: rate,
        icon: 'error'
      });
      return;
    }

    // Alerte warning
    if (rate < this.WARNING_THRESHOLD) {
      this.alerts.push({
        type: 'warning',
        title: `${metricName} en baisse`,
        message: `Le taux de ${metricName} est de ${rate.toFixed(1)}%, légèrement en dessous du seuil optimal de ${this.WARNING_THRESHOLD}%.`,
        month,
        metric: metricName,
        value: rate,
        icon: 'warning'
      });
      return;
    }

    // Alerte sur tendance négative importante
    if (trend !== undefined && trend < this.TREND_WARNING_THRESHOLD) {
      this.alerts.push({
        type: 'warning',
        title: `${metricName} en forte baisse`,
        message: `Le taux de ${metricName} a diminué de ${Math.abs(trend).toFixed(1)}% par rapport au mois précédent.`,
        month,
        metric: metricName,
        value: rate,
        icon: 'trending_down'
      });
    }
  }

  /**
   * Détecte les tendances négatives sur plusieurs mois consécutifs
   */
  private checkNegativeTrends() {
    if (this.monthlySummaries.length < 3) return;

    // Vérifier les 3 derniers mois
    const lastThree = this.monthlySummaries.slice(-3);
    let consecutiveDecline = 0;

    for (let i = 1; i < lastThree.length; i++) {
      const currentRate = lastThree[i].totalMetrics.realRate;
      const previousRate = lastThree[i - 1].totalMetrics.realRate;

      if (currentRate < previousRate) {
        consecutiveDecline++;
      } else {
        consecutiveDecline = 0;
      }
    }

    if (consecutiveDecline >= 2) {
      const latestMonth = lastThree[lastThree.length - 1];
      this.alerts.push({
        type: 'warning',
        title: 'Tendance négative prolongée',
        message: `Le taux d'activité global diminue depuis ${consecutiveDecline} mois consécutifs.`,
        month: latestMonth.month,
        metric: 'Tendance globale',
        icon: 'trending_down'
      });
    }
  }

  /**
   * Retourne la classe CSS pour le type d'alerte
   */
  getAlertClass(type: string): string {
    return `alert-${type}`;
  }

  /**
   * Retourne le label du chip pour le type d'alerte
   */
  getAlertLabel(type: string): string {
    const labels: { [key: string]: string } = {
      critical: 'CRITIQUE',
      warning: 'ATTENTION',
      info: 'INFO'
    };
    return labels[type] || 'INFO';
  }
}

import { Injectable } from '@angular/core';
import { ExpertiseMetrics, TeamMetrics, DailyMetrics, ActivityRateService } from './activity-rate.service';

export interface ProjectStatistics {
  projectName: string;
  totalDays: number;
  frontDays: number;
  backDays: number;
  cdpDays: number;
  designDays: number;
}

export interface CachedMonthData {
  monthName: string;
  expertiseMetrics: ExpertiseMetrics[];
  teamMetrics: TeamMetrics[];
  dailyMetrics: DailyMetrics[];
  expertiseRates: {
    frontEcommerceRate: number;
    backEcommerceRate: number;
    frontSurMesureRate: number;
    backSurMesureRate: number;
  };
  totalRates: {
    realRate: number;
    estimatedRate: number;
  };
  projects: string[];
  projectStats: ProjectStatistics[];
  workingDays: number;
  calculatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private cache: Map<string, CachedMonthData> = new Map();

  constructor(private activityRateService: ActivityRateService) {}

  /**
   * Stocke les données calculées pour un mois
   */
  setMonthData(monthName: string, data: CachedMonthData): void {
    this.cache.set(monthName, {
      ...data,
      calculatedAt: new Date()
    });
  }

  /**
   * Récupère les données en cache pour un mois
   */
  getMonthData(monthName: string): CachedMonthData | undefined {
    return this.cache.get(monthName);
  }

  /**
   * Vérifie si les données d'un mois sont en cache
   */
  hasMonthData(monthName: string): boolean {
    return this.cache.has(monthName);
  }

  /**
   * Récupère tous les mois en cache
   */
  getAllCachedMonths(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Récupère toutes les données en cache
   */
  getAllMonthsData(): CachedMonthData[] {
    return Array.from(this.cache.values());
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Supprime les données d'un mois spécifique
   */
  removeMonthData(monthName: string): void {
    this.cache.delete(monthName);
  }

  /**
   * Récupère les taux d'expertise pour tous les mois
   */
  getAllExpertiseRates(): Map<string, CachedMonthData['expertiseRates']> {
    const rates = new Map<string, CachedMonthData['expertiseRates']>();
    this.cache.forEach((data, monthName) => {
      rates.set(monthName, data.expertiseRates);
    });
    return rates;
  }

  /**
   * Récupère les taux totaux pour tous les mois
   */
  getAllTotalRates(): Map<string, CachedMonthData['totalRates']> {
    const rates = new Map<string, CachedMonthData['totalRates']>();
    this.cache.forEach((data, monthName) => {
      rates.set(monthName, data.totalRates);
    });
    return rates;
  }

  /**
   * Récupère toutes les métriques quotidiennes consolidées
   * Regroupe les demi-journées (Matin + Après-midi) en journées complètes
   */
  getConsolidatedDailyMetrics(): DailyMetrics[] {
    const monthlyMetrics = Array.from(this.cache.entries()).map(([month, data]) => ({
      month,
      dailyMetrics: data.dailyMetrics
    }));

    return this.activityRateService.consolidateAllDailyMetrics(monthlyMetrics);
  }
}

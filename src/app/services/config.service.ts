import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly PLAN_CHARGE_URL_KEY = 'planChargeUrl';
  private readonly DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/1suMIbECtA9dZOJbYtXqUb9eItjlQaZOE1yPCwFwDBCo/edit?gid=0#gid=0';

  constructor() {}

  /**
   * Récupère l'URL du plan de charge depuis le localStorage
   * Si aucune URL n'est configurée, retourne l'URL par défaut
   */
  getPlanChargeUrl(): string {
    const savedUrl = localStorage.getItem(this.PLAN_CHARGE_URL_KEY);
    return savedUrl || this.DEFAULT_URL;
  }

  /**
   * Sauvegarde l'URL du plan de charge dans le localStorage
   */
  setPlanChargeUrl(url: string): void {
    localStorage.setItem(this.PLAN_CHARGE_URL_KEY, url);
  }

  /**
   * Réinitialise l'URL du plan de charge à la valeur par défaut
   */
  resetPlanChargeUrl(): void {
    localStorage.setItem(this.PLAN_CHARGE_URL_KEY, this.DEFAULT_URL);
  }

  /**
   * Retourne l'URL par défaut (sans lire le localStorage)
   */
  getDefaultUrl(): string {
    return this.DEFAULT_URL;
  }
}

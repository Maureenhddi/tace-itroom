import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { MonthlySummary } from '../components/dashboard-summary/dashboard-summary.component';
import { ProjectStatistics } from './activity-rate.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Exporte le dashboard en Excel
   */
  exportDashboardToExcel(monthlySummaries: MonthlySummary[], filename: string = 'dashboard-tace.xlsx') {
    const workbook = XLSX.utils.book_new();

    // Feuille 1 : Résumé global
    const summaryData = this.prepareSummaryData(monthlySummaries);
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    this.styleWorksheet(summaryWorksheet);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Résumé');

    // Feuille 2 : Détails par équipe
    const teamData = this.prepareTeamData(monthlySummaries);
    const teamWorksheet = XLSX.utils.aoa_to_sheet(teamData);
    this.styleWorksheet(teamWorksheet);
    XLSX.utils.book_append_sheet(workbook, teamWorksheet, 'Par Équipe');

    // Feuille 3 : Tendances
    if (monthlySummaries.some(m => m.trends)) {
      const trendsData = this.prepareTrendsData(monthlySummaries);
      const trendsWorksheet = XLSX.utils.aoa_to_sheet(trendsData);
      this.styleWorksheet(trendsWorksheet);
      XLSX.utils.book_append_sheet(workbook, trendsWorksheet, 'Tendances');
    }

    // Télécharger le fichier
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Exporte les projets en Excel
   */
  exportProjectsToExcel(projectStats: ProjectStatistics[], month: string, filename?: string) {
    const workbook = XLSX.utils.book_new();

    const projectData = this.prepareProjectData(projectStats);
    const projectWorksheet = XLSX.utils.aoa_to_sheet(projectData);
    this.styleWorksheet(projectWorksheet);
    XLSX.utils.book_append_sheet(workbook, projectWorksheet, 'Projets');

    const exportFilename = filename || `projets-${month.replace(/\s+/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, exportFilename);
  }

  /**
   * Prépare les données du résumé global
   */
  private prepareSummaryData(monthlySummaries: MonthlySummary[]): any[][] {
    const data: any[][] = [];

    // En-tête
    data.push(['DASHBOARD TACE IT-ROOM - Résumé Global']);
    data.push([]);
    data.push(['Mois', 'Taux Réel (%)', 'Taux Estimé (%)', 'Tendance Réelle (%)']);

    // Données
    monthlySummaries.forEach(summary => {
      data.push([
        summary.month,
        summary.totalMetrics.realRate.toFixed(1),
        summary.totalMetrics.estimatedRate.toFixed(1),
        summary.trends?.realRateTrend !== undefined ? summary.trends.realRateTrend.toFixed(1) : '-'
      ]);
    });

    return data;
  }

  /**
   * Prépare les données par équipe
   */
  private prepareTeamData(monthlySummaries: MonthlySummary[]): any[][] {
    const data: any[][] = [];

    // En-tête
    data.push(['DASHBOARD TACE IT-ROOM - Taux par Équipe']);
    data.push([]);
    data.push([
      'Mois',
      'Front E-commerce (%)',
      'Back E-commerce (%)',
      'Front Sur mesure (%)',
      'Back Sur mesure (%)'
    ]);

    // Données
    monthlySummaries.forEach(summary => {
      data.push([
        summary.month,
        summary.specificTeamMetrics.frontEcommerceRate.toFixed(1),
        summary.specificTeamMetrics.backEcommerceRate.toFixed(1),
        summary.specificTeamMetrics.frontSurMesureRate.toFixed(1),
        summary.specificTeamMetrics.backSurMesureRate.toFixed(1)
      ]);
    });

    return data;
  }

  /**
   * Prépare les données des tendances
   */
  private prepareTrendsData(monthlySummaries: MonthlySummary[]): any[][] {
    const data: any[][] = [];

    // En-tête
    data.push(['DASHBOARD TACE IT-ROOM - Tendances']);
    data.push([]);
    data.push([
      'Mois',
      'Tendance Réelle (%)',
      'Tendance Estimée (%)',
      'Tend. Front E-commerce (%)',
      'Tend. Back E-commerce (%)',
      'Tend. Front Sur mesure (%)',
      'Tend. Back Sur mesure (%)'
    ]);

    // Données
    monthlySummaries.forEach(summary => {
      if (summary.trends) {
        data.push([
          summary.month,
          summary.trends.realRateTrend.toFixed(1),
          summary.trends.estimatedRateTrend.toFixed(1),
          summary.trends.frontEcommerceTrend.toFixed(1),
          summary.trends.backEcommerceTrend.toFixed(1),
          summary.trends.frontSurMesureTrend.toFixed(1),
          summary.trends.backSurMesureTrend.toFixed(1)
        ]);
      } else {
        data.push([summary.month, '-', '-', '-', '-', '-', '-']);
      }
    });

    return data;
  }

  /**
   * Prépare les données des projets
   */
  private prepareProjectData(projectStats: ProjectStatistics[]): any[][] {
    const data: any[][] = [];

    // En-tête
    data.push(['PROJETS - Répartition des Ressources']);
    data.push([]);
    data.push([
      'Projet',
      'Total (demi-j)',
      'Front (demi-j)',
      'Back (demi-j)',
      'CdP (demi-j)',
      'Design (demi-j)'
    ]);

    // Données
    projectStats.forEach(project => {
      data.push([
        project.projectName,
        project.totalDays,
        project.frontDays,
        project.backDays,
        project.cdpDays,
        project.designDays
      ]);
    });

    // Ligne de total
    data.push([]);
    data.push([
      'TOTAL',
      projectStats.reduce((sum, p) => sum + p.totalDays, 0),
      projectStats.reduce((sum, p) => sum + p.frontDays, 0),
      projectStats.reduce((sum, p) => sum + p.backDays, 0),
      projectStats.reduce((sum, p) => sum + p.cdpDays, 0),
      projectStats.reduce((sum, p) => sum + p.designDays, 0)
    ]);

    return data;
  }

  /**
   * Style basique pour la feuille Excel
   */
  private styleWorksheet(worksheet: XLSX.WorkSheet) {
    // Définir la largeur des colonnes
    const colWidths = [
      { wch: 20 },  // Colonne A
      { wch: 15 },  // Colonne B
      { wch: 15 },  // Colonne C
      { wch: 15 },  // Colonne D
      { wch: 15 },  // Colonne E
      { wch: 15 }   // Colonne F
    ];
    worksheet['!cols'] = colWidths;
  }
}

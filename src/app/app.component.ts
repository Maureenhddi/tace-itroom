import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GoogleSheetsService } from './services/google-sheets.service';
import { ThemeService } from './services/theme.service';
import { ActivityRateService, MonthData, TeamMetrics, ExpertiseMetrics, DailyMetrics } from './services/activity-rate.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataTableComponent } from './components/data-table/data-table.component';
import { ActivityChartComponent } from './components/activity-chart/activity-chart.component';
import { DashboardSummaryComponent, MonthlySummary } from './components/dashboard-summary/dashboard-summary.component';
import { Observable, forkJoin } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { TableRow } from './models/table-data.types';

interface MonthlyMetrics {
  month: string;
  data: TableRow[];
  displayedColumns: string[];
  headers: string[];
  dailyMetrics?: DailyMetrics[]; // Pour l'onglet "par jour" uniquement
}

interface MonthTab {
  name: string; // "TAUX D'ACTIVITÉ PAR ÉQUIPE"
  data: TableRow[];
  displayedColumns: string[];
  headers: string[];
  loading: boolean;
  metrics?: TeamMetrics[];
  monthlyData?: MonthlyMetrics[]; // Données mensuelles groupées
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTabsModule,
    MatTooltipModule,
    DataTableComponent,
    ActivityChartComponent,
    DashboardSummaryComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'tace-it-room';
  isSignedIn = false;
  error: string | null = null;
  isDarkMode$!: Observable<boolean>;
  isHomeRoute = true;

  tabs: MonthTab[] = [];
  selectedTabIndex = 0;
  monthlySummaries: MonthlySummary[] = [];
  private totalRatesByMonth: Map<string, { realRate: number; estimatedRate: number }> = new Map();

  constructor(
    private googleSheetsService: GoogleSheetsService,
    private themeService: ThemeService,
    private activityRateService: ActivityRateService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;

    // Listen to route changes to determine if we're on the home route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isHomeRoute = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '';
    });
  }

  ngOnInit() {
    // Check initial route
    this.isHomeRoute = this.router.url === '/' || this.router.url === '';
    this.initGoogleAPI();
  }

  initGoogleAPI() {
    this.googleSheetsService.initClient().subscribe({
      next: () => {
        this.isSignedIn = this.googleSheetsService.isSignedIn();

        if (this.isSignedIn) {
          this.loadAllMonths();
        }
      },
      error: () => {
        this.error = 'Erreur lors de l\'initialisation de l\'API Google';
      }
    });
  }

  signIn() {
    this.googleSheetsService.signIn().subscribe({
      next: () => {
        this.isSignedIn = true;
        this.error = null;
        this.loadAllMonths();
      },
      error: () => {
        this.error = 'Erreur lors de la connexion';
      }
    });
  }

  loadAllMonths() {
    // Créer quatre onglets (+ Tableau de bord)
    this.tabs = [
      {
        name: 'TABLEAU DE BORD',
        data: [],
        displayedColumns: [],
        headers: [],
        loading: true,
        monthlyData: []
      },
      {
        name: 'TAUX D\'ACTIVITÉ PAR ÉQUIPE',
        data: [],
        displayedColumns: [],
        headers: [],
        loading: true,
        monthlyData: []
      },
      {
        name: 'TAUX D\'ACTIVITÉ PAR EXPERTISE',
        data: [],
        displayedColumns: [],
        headers: [],
        loading: true,
        monthlyData: []
      },
      {
        name: 'Visualisation TACE',
        data: [],
        displayedColumns: [],
        headers: [],
        loading: true,
        monthlyData: []
      }
    ];

    this.googleSheetsService.getDefaultSheetNames().subscribe({
      next: (allSheetNames) => {
        const monthPattern = /^(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\s+\d{4}$/;
        let months = allSheetNames.filter(name => monthPattern.test(name));

        // Trier les mois par ordre chronologique
        const monthOrder: { [key: string]: number } = {
          'Janvier': 1, 'Février': 2, 'Mars': 3, 'Avril': 4,
          'Mai': 5, 'Juin': 6, 'Juillet': 7, 'Août': 8,
          'Septembre': 9, 'Octobre': 10, 'Novembre': 11, 'Décembre': 12
        };

        months = months.sort((a, b) => {
          const [monthA, yearA] = a.split(' ');
          const [monthB, yearB] = b.split(' ');

          // Comparer d'abord par année
          const yearDiff = parseInt(yearA) - parseInt(yearB);
          if (yearDiff !== 0) return yearDiff;

          // Ensuite comparer par mois
          return monthOrder[monthA] - monthOrder[monthB];
        });

        console.log('Mois valides détectés (triés):', months);

        if (months.length === 0) {
          this.error = 'Aucun onglet de mois trouvé dans le Google Sheet';
          this.tabs.forEach(tab => tab.loading = false);
          return;
        }

        // Charger les données de tous les mois en parallèle
        const monthRequests = months.map(month =>
          this.googleSheetsService.getDefaultSpreadsheetValues(`'${month}'!A:BC`)
            .pipe(
              map(data => ({ month, data }))
            )
        );

        forkJoin(monthRequests).subscribe({
          next: (results) => {
            const tabDashboard = this.tabs[0];
            const tabEquipe = this.tabs[1];
            const tabExpertise = this.tabs[2];
            const tabDaily = this.tabs[3];
            tabEquipe.monthlyData = [];
            tabExpertise.monthlyData = [];
            tabDaily.monthlyData = [];
            this.monthlySummaries = [];
            this.totalRatesByMonth.clear();

            // Filtrer les résultats pour ne garder que les onglets avec des données valides
            const validResults = results.filter(({ month, data }) => {
              // Vérifier que l'onglet a des données (au moins 4 lignes : headers + au moins 1 ligne de données)
              if (!data || data.length < 4) {
                console.log(`${month}: IGNORÉ - Pas assez de données (${data?.length || 0} lignes)`);
                return false;
              }

              // Calculer automatiquement le nombre de jours ouvrés à partir des données
              const workingDays = this.activityRateService.calculateWorkingDaysFromData(data);

              // Vérifier qu'il y a au moins 1 jour ouvré
              if (workingDays === 0) {
                console.log(`${month}: IGNORÉ - Aucun jour ouvré détecté`);
                return false;
              }

              console.log(`${month}: VALIDE - ${workingDays} jours ouvrés détectés`);
              return true;
            });

            console.log(`Mois valides avec données: ${validResults.length}/${results.length}`);

            validResults.forEach(({ month, data }) => {
              // Utiliser les jours ouvrés configurés dans le service
              const totalRates = this.processMonthData(month, data);
              if (totalRates) {
                this.totalRatesByMonth.set(month, totalRates);
              }
              this.processMonthDataExpertise(month, data);
              this.processMonthDataDaily(month, data);
            });

            if (validResults.length === 0) {
              this.error = 'Aucun mois avec des données valides trouvé';
            }

            tabDashboard.loading = false;
            tabEquipe.loading = false;
            tabExpertise.loading = false;
            tabDaily.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Erreur lors du chargement des données';
            this.tabs.forEach(tab => tab.loading = false);
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des onglets:', error);
        this.error = 'Erreur lors de la récupération de la liste des onglets';
        this.tabs.forEach(tab => tab.loading = false);
      }
    });
  }

  processMonthData(monthName: string, sheetData: (string | number)[][]) {
    // Calculer les métriques avec le service (en DEMI-JOURNÉES)
    const monthData: MonthData = {
      month: monthName,
      workingDays: this.activityRateService.getWorkingDays(monthName),
      sheetData
    };

    const metrics = this.activityRateService.calculateTeamMetrics(monthData);

    // Créer les données du tableau pour ce mois
    const monthlyMetrics: MonthlyMetrics = {
      month: monthName,
      data: [],
      displayedColumns: ['col0', 'col1'],
      headers: ['', '']
    };

    // Transformer les métriques en lignes de tableau et récupérer les taux totaux
    const totalRates = this.transformMetricsToMonthlyData(monthlyMetrics, metrics, monthName);

    // Ajouter à l'onglet équipe
    this.tabs[1].monthlyData!.push(monthlyMetrics);

    // Retourner les taux totaux pour le dashboard
    return totalRates;
  }

  transformMetricsToMonthlyData(monthlyMetrics: MonthlyMetrics, metrics: TeamMetrics[], monthName: string): { realRate: number; estimatedRate: number } | null {
    // Créer les lignes de données
    monthlyMetrics.data = [];

    const workingDays = this.activityRateService.getWorkingDays(monthName);

    // Première ligne : Nombre de jours ouvrés
    monthlyMetrics.data.push({
      col0: 'Nombre jours ouvrés',
      col1: workingDays,
      isCustomRow: true
    });

    // Lignes des équipes
    metrics.forEach(metric => {
      monthlyMetrics.data.push({
        col0: metric.teamName,
        col1: metric.collaboratorCount,
        isCustomRow: true
      });
    });

    // Titre de séparation TOTAL
    monthlyMetrics.data.push({
      col0: 'TOTAL',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    // Récupérer les métriques Total CDS
    const totalCDS = metrics.find(m => m.teamName === 'Total CDS');

    if (!totalCDS) {
      return null;
    }

    // Calcul capacité théorique = nb jours ouvrés × nombre collab CDS (en JOURS ENTIERS)
    const capaciteTheorique = workingDays * totalCDS.collaboratorCount;

    // Calcul capacité réelle = capacité théorique - jours absence (déjà en JOURS ENTIERS)
    const capaciteReelle = capaciteTheorique - totalCDS.absenceDays;

    // Calcul des taux d'activité
    // Taux estimé = (capacité théorique - abs - non-aff) / (capacité théorique - abs)
    const tauxEstime = capaciteReelle > 0
      ? ((capaciteTheorique - totalCDS.absenceDays - totalCDS.nonAffectedDays) / capaciteReelle) * 100
      : 0;

    // Taux réel = (capacité théorique - abs - non-aff - prévision) / (capacité théorique - abs)
    const tauxReel = capaciteReelle > 0
      ? ((capaciteTheorique - totalCDS.absenceDays - totalCDS.nonAffectedDays - totalCDS.previsionDays) / capaciteReelle) * 100
      : 0;

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    monthlyMetrics.data.push({
      col0: 'Taux d\'activité réel (hors prévision)',
      col1: Math.round(tauxReel * 10) / 10 + ' %', // Arrondi à 1 décimale avec %
      isCustomRow: true,
      isRateRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Taux d\'activité estimé (prévision inclus)',
      col1: Math.round(tauxEstime * 10) / 10 + ' %', // Arrondi à 1 décimale avec %
      isCustomRow: true,
      isRateRow: true
    });

    // Lignes de capacité après
    monthlyMetrics.data.push({
      col0: 'Capacité de production théorique',
      col1: capaciteTheorique,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Jours Absence : congés/OUT total',
      col1: Math.round(totalCDS.absenceDays * 10) / 10, // Arrondi à 1 décimale
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Jours interne',
      col1: Math.round(totalCDS.interneDays * 10) / 10, // Arrondi à 1 décimale
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Jours Non Affecté',
      col1: Math.round(totalCDS.nonAffectedDays * 10) / 10, // Arrondi à 1 décimale
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Jours Prevision',
      col1: Math.round(totalCDS.previsionDays * 10) / 10, // Arrondi à 1 décimale
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Capacité de production réelle en jours',
      col1: Math.round(capaciteReelle * 10) / 10, // Arrondi à 1 décimale
      isCustomRow: true
    });

    // Titre de séparation EQUIPE FRONT
    monthlyMetrics.data.push({
      col0: 'EQUIPE FRONT',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    // Récupérer les métriques Equipe Front
    const equipeFront = metrics.find(m => m.teamName === 'Equipe Front');

    if (equipeFront) {
      // Jours à produire Front = nb jours ouvrés × nombre collab front (en JOURS ENTIERS)
      const joursAProduireFront = workingDays * equipeFront.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateTeamMetricsInDays()
      const capaciteReelleFront = joursAProduireFront - equipeFront.absenceDays;

      const tauxEstimeFront = capaciteReelleFront > 0
        ? ((joursAProduireFront - equipeFront.absenceDays - equipeFront.nonAffectedDays) / capaciteReelleFront) * 100
        : 0;

      const tauxReelFront = capaciteReelleFront > 0
        ? ((joursAProduireFront - equipeFront.absenceDays - equipeFront.nonAffectedDays - equipeFront.previsionDays) / capaciteReelleFront) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReelFront * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstimeFront * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Front',
        col1: joursAProduireFront,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Front',
        col1: Math.round(equipeFront.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Front',
        col1: Math.round(equipeFront.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Front',
        col1: Math.round(equipeFront.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Titre de séparation EQUIPE BACK
    monthlyMetrics.data.push({
      col0: 'EQUIPE BACK',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    // Récupérer les métriques Equipe Back
    const equipeBack = metrics.find(m => m.teamName === 'Equipe Back');

    if (equipeBack) {
      // Jours à produire Back = nb jours ouvrés × nombre collab back (en JOURS ENTIERS)
      const joursAProduireBack = workingDays * equipeBack.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateTeamMetricsInDays()
      const capaciteReelleBack = joursAProduireBack - equipeBack.absenceDays;

      const tauxEstimeBack = capaciteReelleBack > 0
        ? ((joursAProduireBack - equipeBack.absenceDays - equipeBack.nonAffectedDays) / capaciteReelleBack) * 100
        : 0;

      const tauxReelBack = capaciteReelleBack > 0
        ? ((joursAProduireBack - equipeBack.absenceDays - equipeBack.nonAffectedDays - equipeBack.previsionDays) / capaciteReelleBack) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReelBack * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstimeBack * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Back',
        col1: joursAProduireBack,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Back',
        col1: Math.round(equipeBack.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Back',
        col1: Math.round(equipeBack.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Back',
        col1: Math.round(equipeBack.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Titre de séparation EQUIPE CdP
    monthlyMetrics.data.push({
      col0: 'EQUIPE CdP',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    // Récupérer les métriques Equipe CdP
    const equipeCdP = metrics.find(m => m.teamName === 'Equipe CdP');

    if (equipeCdP) {
      // Jours à produire CdP = nb jours ouvrés × nombre collab CdP (en JOURS ENTIERS)
      const joursAProduireCdP = workingDays * equipeCdP.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateTeamMetricsInDays()
      const capaciteReelleCdP = joursAProduireCdP - equipeCdP.absenceDays;

      const tauxEstimeCdP = capaciteReelleCdP > 0
        ? ((joursAProduireCdP - equipeCdP.absenceDays - equipeCdP.nonAffectedDays) / capaciteReelleCdP) * 100
        : 0;

      const tauxReelCdP = capaciteReelleCdP > 0
        ? ((joursAProduireCdP - equipeCdP.absenceDays - equipeCdP.nonAffectedDays - equipeCdP.previsionDays) / capaciteReelleCdP) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReelCdP * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstimeCdP * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire CdP',
        col1: joursAProduireCdP,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT CdP',
        col1: Math.round(equipeCdP.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté CdP',
        col1: Math.round(equipeCdP.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision CdP',
        col1: Math.round(equipeCdP.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Titre de séparation EQUIPE DESIGN
    monthlyMetrics.data.push({
      col0: 'EQUIPE DESIGN',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    // Récupérer les métriques Equipe Design
    const equipeDesign = metrics.find(m => m.teamName === 'Equipe Design');

    if (equipeDesign) {
      // Jours à produire Design = nb jours ouvrés × nombre collab Design (en JOURS ENTIERS)
      const joursAProduireDesign = workingDays * equipeDesign.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateTeamMetricsInDays()
      const capaciteReelleDesign = joursAProduireDesign - equipeDesign.absenceDays;

      const tauxEstimeDesign = capaciteReelleDesign > 0
        ? ((joursAProduireDesign - equipeDesign.absenceDays - equipeDesign.nonAffectedDays) / capaciteReelleDesign) * 100
        : 0;

      const tauxReelDesign = capaciteReelleDesign > 0
        ? ((joursAProduireDesign - equipeDesign.absenceDays - equipeDesign.nonAffectedDays - equipeDesign.previsionDays) / capaciteReelleDesign) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReelDesign * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstimeDesign * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Design',
        col1: joursAProduireDesign,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Design',
        col1: Math.round(equipeDesign.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Design',
        col1: Math.round(equipeDesign.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Design',
        col1: Math.round(equipeDesign.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Retourner les taux totaux pour le dashboard
    return {
      realRate: Math.round(tauxReel * 10) / 10,
      estimatedRate: Math.round(tauxEstime * 10) / 10
    };
  }

  processMonthDataExpertise(monthName: string, sheetData: (string | number)[][]) {
    // Calculer les métriques d'expertise avec le service (en DEMI-JOURNÉES)
    const monthData: MonthData = {
      month: monthName,
      workingDays: this.activityRateService.getWorkingDays(monthName),
      sheetData
    };

    const expertiseMetrics = this.activityRateService.calculateExpertiseMetrics(monthData);
    const teamMetrics = this.activityRateService.calculateTeamMetrics(monthData);

    // Créer les données du tableau pour ce mois
    const monthlyMetrics: MonthlyMetrics = {
      month: monthName,
      data: [],
      displayedColumns: ['col0', 'col1'],
      headers: ['', '']
    };

    // Transformer les métriques en lignes de tableau
    this.transformExpertiseMetricsToMonthlyData(monthlyMetrics, expertiseMetrics, teamMetrics, monthName);

    // Ajouter à l'onglet expertise
    this.tabs[2].monthlyData!.push(monthlyMetrics);
  }

  transformExpertiseMetricsToMonthlyData(
    monthlyMetrics: MonthlyMetrics,
    expertiseMetrics: ExpertiseMetrics[],
    teamMetrics: TeamMetrics[],
    monthName: string
  ) {
    monthlyMetrics.data = [];
    const workingDays = this.activityRateService.getWorkingDays(monthName);

    // Nombre de jours ouvrés
    monthlyMetrics.data.push({
      col0: 'Nombre jours ouvrés',
      col1: workingDays,
      isCustomRow: true
    });

    // Compter les collaborateurs par catégorie
    const totalCDS = teamMetrics.find(m => m.teamName === 'Total CDS');
    const equipeFront = teamMetrics.find(m => m.teamName === 'Equipe Front');
    const equipeBack = teamMetrics.find(m => m.teamName === 'Equipe Back');
    const equipeCdP = teamMetrics.find(m => m.teamName === 'Equipe CdP');
    const equipeDesign = teamMetrics.find(m => m.teamName === 'Equipe Design');

    const frontEcommerce = expertiseMetrics.find(m => m.expertiseName === 'Front E-commerce');
    const frontSurMesure = expertiseMetrics.find(m => m.expertiseName === 'Front Sur mesure');
    const backEcommerce = expertiseMetrics.find(m => m.expertiseName === 'Back E-commerce');
    const backSurMesure = expertiseMetrics.find(m => m.expertiseName === 'Back Sur mesure');

    monthlyMetrics.data.push({
      col0: 'Nombre collab CDS',
      col1: totalCDS?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Front',
      col1: equipeFront?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Front E-commerce',
      col1: frontEcommerce?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Front Sur mesure',
      col1: frontSurMesure?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Back',
      col1: equipeBack?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Back E-commerce',
      col1: backEcommerce?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Back Sur mesure',
      col1: backSurMesure?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab CdP',
      col1: equipeCdP?.collaboratorCount || 0,
      isCustomRow: true
    });

    monthlyMetrics.data.push({
      col0: 'Nombre collab Design',
      col1: equipeDesign?.collaboratorCount || 0,
      isCustomRow: true
    });

    // Section TOTAL
    monthlyMetrics.data.push({
      col0: 'TOTAL',
      col1: '',
      isCustomRow: true,
      isTitleRow: true
    });

    if (totalCDS) {
      const capaciteTheorique = workingDays * totalCDS.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateTeamMetricsInDays()
      const capaciteReelle = capaciteTheorique - totalCDS.absenceDays;

      const tauxEstime = capaciteReelle > 0
        ? ((capaciteTheorique - totalCDS.absenceDays - totalCDS.nonAffectedDays) / capaciteReelle) * 100
        : 0;

      const tauxReel = capaciteReelle > 0
        ? ((capaciteTheorique - totalCDS.absenceDays - totalCDS.nonAffectedDays - totalCDS.previsionDays) / capaciteReelle) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel (hors prévision)',
        col1: Math.round(tauxReel * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé (prévision inclus)',
        col1: Math.round(tauxEstime * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Capacité de production théorique',
        col1: capaciteTheorique,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT total',
        col1: Math.round(totalCDS.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Capacité de production réelle (en jours)',
        col1: Math.round(capaciteReelle * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours interne',
        col1: Math.round(totalCDS.interneDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Non Affecté',
        col1: Math.round(totalCDS.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision',
        col1: Math.round(totalCDS.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Section Equipe Front E-commerce
    if (frontEcommerce) {
      monthlyMetrics.data.push({
        col0: 'EQUIPE FRONT E-COMMERCE',
        col1: '',
        isCustomRow: true,
        isTitleRow: true
      });

      const joursAProduire = workingDays * frontEcommerce.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateExpertiseMetricsInDays()
      const capaciteReelle = joursAProduire - frontEcommerce.absenceDays;

      const tauxEstime = capaciteReelle > 0
        ? ((joursAProduire - frontEcommerce.absenceDays - frontEcommerce.nonAffectedDays) / capaciteReelle) * 100
        : 0;

      const tauxReel = capaciteReelle > 0
        ? ((joursAProduire - frontEcommerce.absenceDays - frontEcommerce.nonAffectedDays - frontEcommerce.previsionDays) / capaciteReelle) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReel * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstime * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Front',
        col1: joursAProduire,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Front',
        col1: Math.round(frontEcommerce.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Front',
        col1: Math.round(frontEcommerce.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Front',
        col1: Math.round(frontEcommerce.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Section Equipe Back E-commerce
    if (backEcommerce) {
      monthlyMetrics.data.push({
        col0: 'EQUIPE BACK E-COMMERCE',
        col1: '',
        isCustomRow: true,
        isTitleRow: true
      });

      const joursAProduire = workingDays * backEcommerce.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateExpertiseMetricsInDays()
      const capaciteReelle = joursAProduire - backEcommerce.absenceDays;

      const tauxEstime = capaciteReelle > 0
        ? ((joursAProduire - backEcommerce.absenceDays - backEcommerce.nonAffectedDays) / capaciteReelle) * 100
        : 0;

      const tauxReel = capaciteReelle > 0
        ? ((joursAProduire - backEcommerce.absenceDays - backEcommerce.nonAffectedDays - backEcommerce.previsionDays) / capaciteReelle) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReel * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstime * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Back',
        col1: joursAProduire,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Back',
        col1: Math.round(backEcommerce.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Back',
        col1: Math.round(backEcommerce.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Back',
        col1: Math.round(backEcommerce.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Section Equipe Front Sur mesure
    if (frontSurMesure) {
      monthlyMetrics.data.push({
        col0: 'EQUIPE FRONT SUR MESURE',
        col1: '',
        isCustomRow: true,
        isTitleRow: true
      });

      const joursAProduire = workingDays * frontSurMesure.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateExpertiseMetricsInDays()
      const capaciteReelle = joursAProduire - frontSurMesure.absenceDays;

      const tauxEstime = capaciteReelle > 0
        ? ((joursAProduire - frontSurMesure.absenceDays - frontSurMesure.nonAffectedDays) / capaciteReelle) * 100
        : 0;

      const tauxReel = capaciteReelle > 0
        ? ((joursAProduire - frontSurMesure.absenceDays - frontSurMesure.nonAffectedDays - frontSurMesure.previsionDays) / capaciteReelle) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReel * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstime * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Front',
        col1: joursAProduire,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Front',
        col1: Math.round(frontSurMesure.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Front',
        col1: Math.round(frontSurMesure.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Front',
        col1: Math.round(frontSurMesure.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }

    // Section Equipe Back Sur mesure
    if (backSurMesure) {
      monthlyMetrics.data.push({
        col0: 'EQUIPE BACK SUR MESURE',
        col1: '',
        isCustomRow: true,
        isTitleRow: true
      });

      const joursAProduire = workingDays * backSurMesure.collaboratorCount;

      // Les données sont déjà en JOURS ENTIERS grâce à calculateExpertiseMetricsInDays()
      const capaciteReelle = joursAProduire - backSurMesure.absenceDays;

      const tauxEstime = capaciteReelle > 0
        ? ((joursAProduire - backSurMesure.absenceDays - backSurMesure.nonAffectedDays) / capaciteReelle) * 100
        : 0;

      const tauxReel = capaciteReelle > 0
        ? ((joursAProduire - backSurMesure.absenceDays - backSurMesure.nonAffectedDays - backSurMesure.previsionDays) / capaciteReelle) * 100
        : 0;

      // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
      monthlyMetrics.data.push({
        col0: 'Taux d\'activité réel global',
        col1: Math.round(tauxReel * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Taux d\'activité estimé global',
        col1: Math.round(tauxEstime * 10) / 10 + ' %',
        isCustomRow: true,
        isRateRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours à produire Back',
        col1: joursAProduire,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Absence : congés/OUT Back',
        col1: Math.round(backSurMesure.absenceDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours non Affecté Back',
        col1: Math.round(backSurMesure.nonAffectedDays * 10) / 10,
        isCustomRow: true
      });

      monthlyMetrics.data.push({
        col0: 'Jours Prevision Back',
        col1: Math.round(backSurMesure.previsionDays * 10) / 10,
        isCustomRow: true
      });
    }
  }

  processMonthDataDaily(monthName: string, sheetData: (string | number)[][]) {
    // Calculer les métriques quotidiennes avec le service
    const monthData: MonthData = {
      month: monthName,
      workingDays: this.activityRateService.getWorkingDays(monthName),
      sheetData
    };

    const dailyMetrics = this.activityRateService.calculateDailyMetrics(monthData);

    console.log(`[${monthName}] Daily metrics count:`, dailyMetrics.length);
    if (dailyMetrics.length > 0) {
      console.log(`[${monthName}] First day:`, dailyMetrics[0]);
      console.log(`[${monthName}] Last day:`, dailyMetrics[dailyMetrics.length - 1]);
    }

    // Créer les données du tableau pour ce mois
    const monthlyMetrics: MonthlyMetrics = {
      month: monthName,
      data: [],
      displayedColumns: [],
      headers: [],
      dailyMetrics: dailyMetrics // Stocker les métriques quotidiennes pour les graphiques
    };

    // Transformer les métriques en lignes de tableau
    this.transformDailyMetricsToMonthlyData(monthlyMetrics, dailyMetrics);

    // Ajouter à l'onglet daily
    this.tabs[3].monthlyData!.push(monthlyMetrics);

    // Calculer le résumé mensuel pour le tableau de bord
    const summary = this.activityRateService.calculateMonthlySummary(dailyMetrics);
    const totalRates = this.totalRatesByMonth.get(monthName);

    this.monthlySummaries.push({
      month: monthName,
      totalMetrics: {
        realRate: totalRates?.realRate || 0,
        estimatedRate: totalRates?.estimatedRate || 0
      },
      teamMetrics: {
        frontRate: summary.frontRate,
        backRate: summary.backRate
      },
      expertiseMetrics: {
        ecommerceRate: summary.ecommerceRate,
        surMesureRate: summary.surMesureRate
      }
    });
  }

  transformDailyMetricsToMonthlyData(monthlyMetrics: MonthlyMetrics, dailyMetrics: DailyMetrics[]) {
    // Créer les colonnes dynamiques : col0 pour le nom de la métrique, puis une colonne par jour
    const columns = ['col0'];
    const headers = [''];

    // Ajouter les en-têtes de dates
    dailyMetrics.forEach((day, index) => {
      columns.push(`col${index + 1}`);
      headers.push(day.date);
    });

    monthlyMetrics.displayedColumns = columns;
    monthlyMetrics.headers = headers;
    monthlyMetrics.data = [];

    // Helper pour créer une ligne
    const createRow = (label: string, values: (string | number)[], isTitle: boolean = false, isRate: boolean = false): TableRow => {
      const row: TableRow = {
        col0: label,
        isCustomRow: true
      };
      if (isTitle) {
        row.isTitleRow = true;
      }
      if (isRate) {
        row.isRateRow = true;
      }
      values.forEach((value, index) => {
        row[`col${index + 1}`] = value;
      });
      return row;
    };

    // Ligne 1: Nombre jours ouvrés (1 pour chaque demi-journée)
    monthlyMetrics.data.push(createRow(
      'Nombre jours ouvrés',
      dailyMetrics.map(() => 1)
    ));

    // Ligne 2: Nombre collab CDS
    monthlyMetrics.data.push(createRow(
      'Nombre collab CDS',
      dailyMetrics.map(d => d.totalCDS)
    ));

    // Ligne 3: Nombre collab Front
    monthlyMetrics.data.push(createRow(
      'Nombre collab Front',
      dailyMetrics.map(d => d.equipeFront)
    ));

    // Ligne 4: Nombre collab Front E-commerce
    monthlyMetrics.data.push(createRow(
      'Nombre collab Front E-commerce',
      dailyMetrics.map(d => d.frontEcommerce)
    ));

    // Ligne 5: Nombre collab Front Sur mesure
    monthlyMetrics.data.push(createRow(
      'Nombre collab Front Sur mesure',
      dailyMetrics.map(d => d.frontSurMesure)
    ));

    // Ligne 6: Nombre collab Back
    monthlyMetrics.data.push(createRow(
      'Nombre collab Back',
      dailyMetrics.map(d => d.equipeBack)
    ));

    // Ligne 7: Nombre collab Back E-commerce
    monthlyMetrics.data.push(createRow(
      'Nombre collab Back E-commerce',
      dailyMetrics.map(d => d.backEcommerce)
    ));

    // Ligne 8: Nombre collab Back Sur mesure
    monthlyMetrics.data.push(createRow(
      'Nombre collab Back Sur mesure',
      dailyMetrics.map(d => d.backSurMesure)
    ));

    // Ligne 9: Nombre collab CdP
    monthlyMetrics.data.push(createRow(
      'Nombre collab CdP',
      dailyMetrics.map(d => d.equipeCdP)
    ));

    // Ligne 10: Nombre collab Design
    monthlyMetrics.data.push(createRow(
      'Nombre collab Design',
      dailyMetrics.map(d => d.equipeDesign)
    ));

    // Section TOTAL
    monthlyMetrics.data.push(createRow('TOTAL', dailyMetrics.map(() => ''), true));

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    // Taux d'activité réel (hors prévision) = (capacité réelle - jours non affecté - jours prévision) / capacité réelle
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité réel (hors prévision)',
      dailyMetrics.map(d => {
        const capaciteTheorique = 1 * d.totalCDS;
        const capaciteReelle = capaciteTheorique - d.absences;
        if (capaciteReelle <= 0) return '0 %';
        const taux = ((capaciteReelle - d.nonAffected - d.prevision) / capaciteReelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    // Taux d'activité estimé (prévision inclus) = (capacité réelle - jours non affecté) / capacité réelle
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité estimé (prévision inclus)',
      dailyMetrics.map(d => {
        const capaciteTheorique = 1 * d.totalCDS;
        const capaciteReelle = capaciteTheorique - d.absences;
        if (capaciteReelle <= 0) return '0 %';
        const taux = ((capaciteReelle - d.nonAffected) / capaciteReelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    // Capacité de production théorique = 1 × nb collab CDS
    monthlyMetrics.data.push(createRow(
      'Capacité de production théorique',
      dailyMetrics.map(d => 1 * d.totalCDS)
    ));

    // Jours Absence : congés/OUT total (NON cumulatif, uniquement pour cette demi-journée)
    monthlyMetrics.data.push(createRow(
      'Jours Absence : congés/OUT total',
      dailyMetrics.map(d => d.absences)
    ));

    // Capacité de production réelle (en jours) = Capacité théorique - Jours Absence
    monthlyMetrics.data.push(createRow(
      'Capacité de production réelle (en jours)',
      dailyMetrics.map(d => {
        const capaciteTheorique = 1 * d.totalCDS;
        const capaciteReelle = capaciteTheorique - d.absences;
        return Math.round(capaciteReelle * 10) / 10;
      })
    ));

    // Jours interne (NON cumulatif)
    monthlyMetrics.data.push(createRow(
      'Jours interne',
      dailyMetrics.map(d => d.interne)
    ));

    // Jours Non Affecté (NON cumulatif)
    monthlyMetrics.data.push(createRow(
      'Jours Non Affecté',
      dailyMetrics.map(d => d.nonAffected)
    ));

    // Jours Prevision (NON cumulatif)
    monthlyMetrics.data.push(createRow(
      'Jours Prevision',
      dailyMetrics.map(d => d.prevision)
    ));

    // Section Equipe Front E-commerce
    monthlyMetrics.data.push(createRow('EQUIPE FRONT E-COMMERCE', dailyMetrics.map(() => ''), true));

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité réel global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.frontEcommerce; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.frontEcommerceAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.frontEcommerceNonAffected - d.frontEcommercePrevision) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Taux d\'activité estimé global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.frontEcommerce; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.frontEcommerceAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.frontEcommerceNonAffected) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Jours à produire Front',
      dailyMetrics.map(d => d.frontEcommerce)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Absence : congés/OUT Front',
      dailyMetrics.map(d => Math.round(d.frontEcommerceAbsences * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours non Affecté Front',
      dailyMetrics.map(d => Math.round(d.frontEcommerceNonAffected * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Prevision Front',
      dailyMetrics.map(d => Math.round(d.frontEcommercePrevision * 10) / 10)
    ));

    // Section Equipe Back E-commerce
    monthlyMetrics.data.push(createRow('EQUIPE BACK E-COMMERCE', dailyMetrics.map(() => ''), true));

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité réel global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.backEcommerce; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.backEcommerceAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.backEcommerceNonAffected - d.backEcommercePrevision) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Taux d\'activité estimé global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.backEcommerce; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.backEcommerceAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.backEcommerceNonAffected) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours à produire Back',
      dailyMetrics.map(d => d.backEcommerce)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Absence : congés/OUT Back',
      dailyMetrics.map(d => Math.round(d.backEcommerceAbsences * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours non Affecté Back',
      dailyMetrics.map(d => Math.round(d.backEcommerceNonAffected * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Prevision Back',
      dailyMetrics.map(d => Math.round(d.backEcommercePrevision * 10) / 10)
    ));

    // Section Equipe Front Sur mesure
    monthlyMetrics.data.push(createRow('EQUIPE FRONT SUR MESURE', dailyMetrics.map(() => ''), true));

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité réel global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.frontSurMesure; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.frontSurMesureAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.frontSurMesureNonAffected - d.frontSurMesurePrevision) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Taux d\'activité estimé global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.frontSurMesure; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.frontSurMesureAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.frontSurMesureNonAffected) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Jours à produire Front',
      dailyMetrics.map(d => d.frontSurMesure)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Absence : congés/OUT Front',
      dailyMetrics.map(d => Math.round(d.frontSurMesureAbsences * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours non Affecté Front',
      dailyMetrics.map(d => Math.round(d.frontSurMesureNonAffected * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Prevision Front',
      dailyMetrics.map(d => Math.round(d.frontSurMesurePrevision * 10) / 10)
    ));

    // Section Equipe Back Sur mesure
    monthlyMetrics.data.push(createRow('EQUIPE BACK SUR MESURE', dailyMetrics.map(() => ''), true));

    // *** TAUX D'ACTIVITÉ EN PREMIER AVEC STYLE ***
    monthlyMetrics.data.push(createRow(
      'Taux d\'activité réel global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.backSurMesure; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.backSurMesureAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.backSurMesureNonAffected - d.backSurMesurePrevision) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Taux d\'activité estimé global',
      dailyMetrics.map(d => {
        const capaciteTheorique = d.backSurMesure; // Capacité en demi-journées
        const reelle = capaciteTheorique - d.backSurMesureAbsences;
        if (reelle <= 0) return '0 %';
        const taux = ((reelle - d.backSurMesureNonAffected) / reelle) * 100;
        return Math.round(taux * 100) / 100 + '%';
      }),
      false,
      true
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours à produire Back',
      dailyMetrics.map(d => d.backSurMesure)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Absence : congés/OUT Back',
      dailyMetrics.map(d => Math.round(d.backSurMesureAbsences * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours non Affecté Back',
      dailyMetrics.map(d => Math.round(d.backSurMesureNonAffected * 10) / 10)
    ));

    monthlyMetrics.data.push(createRow(
      'Demi jours Prevision Back',
      dailyMetrics.map(d => Math.round(d.backSurMesurePrevision * 10) / 10)
    ));
  }

  signOut() {
    this.googleSheetsService.signOut().subscribe({
      next: () => {
        this.isSignedIn = false;
        this.tabs = [];
      },
      error: () => { }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

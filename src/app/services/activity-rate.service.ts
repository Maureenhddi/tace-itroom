import { Injectable } from '@angular/core';

export interface TeamConfig {
  name: string;
  cdsOnly: boolean; // Uniquement les CDS
  profileFilter?: string; // DEV FRONT, DEV BACK, CdP, GRAPHISTE
}

export interface MonthData {
  month: string; // "Octobre 2025"
  workingDays: number;
  sheetData: (string | number)[][];
}

export interface TeamMetrics {
  teamName: string;
  collaboratorCount: number;
  collaboratorNames: string[]; // Liste des noms des collaborateurs
  theoreticalCapacity: number;
  absenceDays: number;
  realRate: number; // Taux réel (sans prévision)
  interneDays: number;
  nonAffectedDays: number;
  previsionDays: number;
  estimatedRate: number; // Taux estimé (avec prévision)
}

export interface ExpertiseMetrics {
  expertiseName: string;
  collaboratorCount: number;
  collaboratorNames: string[];
  absenceDays: number;
  nonAffectedDays: number;
  previsionDays: number;
}

export interface DailyMetrics {
  date: string; // "01/10/2025"
  dayIndex: number; // Index de la colonne dans le sheet (5+ pour les jours)
  isWorkingDay: boolean;
  cumulativeWorkingDays: number;
  totalCDS: number;
  equipeFront: number;
  frontEcommerce: number;
  frontSurMesure: number;
  equipeBack: number;
  backEcommerce: number;
  backSurMesure: number;
  equipeCdP: number;
  equipeDesign: number;
  // Métriques NON cumulatives (pour cette demi-journée uniquement)
  absences: number;
  interne: number;
  nonAffected: number;
  prevision: number;
  // Métriques cumulatives
  cumulativeAbsences: number;
  cumulativeInterne: number;
  cumulativeNonAffected: number;
  cumulativePrevision: number;
  // Métriques par expertise NON cumulatives
  frontEcommerceAbsences: number;
  frontEcommerceNonAffected: number;
  frontEcommercePrevision: number;
  backEcommerceAbsences: number;
  backEcommerceNonAffected: number;
  backEcommercePrevision: number;
  frontSurMesureAbsences: number;
  frontSurMesureNonAffected: number;
  frontSurMesurePrevision: number;
  backSurMesureAbsences: number;
  backSurMesureNonAffected: number;
  backSurMesurePrevision: number;
  // Métriques par expertise CUMULATIVES
  cumulativeFrontEcommerceAbsences: number;
  cumulativeFrontEcommerceNonAffected: number;
  cumulativeFrontEcommercePrevision: number;
  cumulativeBackEcommerceAbsences: number;
  cumulativeBackEcommerceNonAffected: number;
  cumulativeBackEcommercePrevision: number;
  cumulativeFrontSurMesureAbsences: number;
  cumulativeFrontSurMesureNonAffected: number;
  cumulativeFrontSurMesurePrevision: number;
  cumulativeBackSurMesureAbsences: number;
  cumulativeBackSurMesureNonAffected: number;
  cumulativeBackSurMesurePrevision: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityRateService {

  // Configuration des équipes à suivre
  private teams: TeamConfig[] = [
    { name: 'Equipe Front', cdsOnly: true, profileFilter: 'DEV FRONT' },
    { name: 'Equipe Back', cdsOnly: true, profileFilter: 'DEV BACK' },
    { name: 'Equipe CdP', cdsOnly: true, profileFilter: 'CdP' },
    { name: 'Equipe Design', cdsOnly: true, profileFilter: 'GRAPHISTE' }
  ];

  constructor() {}

  /**
   * Calcule automatiquement le nombre de jours ouvrés dans un mois
   * Un jour ouvré est un jour de semaine (lundi-vendredi, hors weekends)
   */
  private calculateWorkingDaysInMonth(monthName: string): number {
    // Parser le nom du mois (ex: "Octobre 2025", "Novembre 2025")
    const monthMap: { [key: string]: number } = {
      'Janvier': 0, 'Février': 1, 'Mars': 2, 'Avril': 3,
      'Mai': 4, 'Juin': 5, 'Juillet': 6, 'Août': 7,
      'Septembre': 8, 'Octobre': 9, 'Novembre': 10, 'Décembre': 11
    };

    const parts = monthName.split(' ');
    if (parts.length !== 2) {
      console.warn(`Format de mois invalide: ${monthName}`);
      return 22; // Valeur par défaut
    }

    const monthNamePart = parts[0];
    const year = parseInt(parts[1], 10);
    const monthIndex = monthMap[monthNamePart];

    if (monthIndex === undefined || isNaN(year)) {
      console.warn(`Mois ou année invalide: ${monthName}`);
      return 22; // Valeur par défaut
    }

    // Compter les jours ouvrés (lundi à vendredi)
    let workingDays = 0;
    const date = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate(); // Dernier jour du mois

    for (let day = 1; day <= lastDay; day++) {
      date.setDate(day);
      const dayOfWeek = date.getDay();

      // 0 = Dimanche, 6 = Samedi
      // On compte les jours du lundi (1) au vendredi (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }

    console.log(`[${monthName}] Jours ouvrés calculés automatiquement: ${workingDays}`);
    return workingDays;
  }

  /**
   * Calcule les métriques d'activité pour toutes les équipes sur un mois donné
   */
  calculateTeamMetrics(monthData: MonthData): TeamMetrics[] {
    const results: TeamMetrics[] = [];

    // Ajouter d'abord le nombre total de CDS
    const totalCDSMetrics = this.calculateTotalCDS(monthData);
    results.push(totalCDSMetrics);

    for (const team of this.teams) {
      const metrics = this.calculateTeamMetric(team, monthData);
      results.push(metrics);
    }

    return results;
  }

  /**
   * Calcule le nombre total de collaborateurs CDS (tous profils)
   */
  private calculateTotalCDS(monthData: MonthData): TeamMetrics {
    const dataRows = monthData.sheetData.slice(3);

    // Filtrer uniquement les CDS (tous profils)
    const cdsMembers = dataRows.filter(row => row[4] === 'CDS');
    const collaboratorNames = cdsMembers.map(row => String(row[1] || '')).filter(name => name.trim() !== '');
    const collaboratorCount = cdsMembers.length;

    // Calculer les jours d'absence, interne, non-affecté et prévision pour tous les CDS
    let absenceDays = 0;
    let interneDays = 0;
    let nonAffectedDays = 0;
    let previsionDays = 0;

    cdsMembers.forEach(row => {
      // Les colonnes 5+ contiennent les missions/statuts pour chaque jour
      for (let i = 5; i < row.length; i++) {
        const cellValue = String(row[i] || '');

        if (cellValue.includes('Absence')) {
          absenceDays += 0.5; // Chaque cellule = 1 demi-journée
        } else if (cellValue.includes('Interne')) {
          interneDays += 0.5;
        } else if (cellValue.includes('Non-Aff')) {
          nonAffectedDays += 0.5;
        } else if (cellValue.includes('Prévision')) {
          previsionDays += 0.5;
        }
      }
    });

    const theoreticalCapacity = monthData.workingDays * collaboratorCount;
    const realCapacity = theoreticalCapacity - absenceDays;

    const estimatedRate = realCapacity > 0
      ? (theoreticalCapacity - absenceDays - nonAffectedDays) / realCapacity
      : 0;

    const realRate = realCapacity > 0
      ? (theoreticalCapacity - absenceDays - nonAffectedDays - previsionDays) / realCapacity
      : 0;

    return {
      teamName: 'Total CDS',
      collaboratorCount,
      collaboratorNames,
      theoreticalCapacity,
      absenceDays,
      realRate,
      interneDays,
      nonAffectedDays,
      previsionDays,
      estimatedRate,
      
    };
  }

  /**
   * Calcule les métriques pour une équipe spécifique
   */
  private calculateTeamMetric(team: TeamConfig, monthData: MonthData): TeamMetrics {
    // Les 3 premières lignes sont des headers, les vraies données commencent à la ligne 3
    const dataRows = monthData.sheetData.slice(3);

    // Filtrer les collaborateurs de l'équipe
    const teamMembers = dataRows.filter(row => {
      // Colonne 4 (index 4) = RÉGIE / CDS
      const isCDS = row[4] === 'CDS';

      if (!team.cdsOnly || !isCDS) {
        return false;
      }

      // Colonne 3 (index 3) = PROFIL (DEV FRONT, DEV BACK, etc.)
      if (team.profileFilter) {
        return row[3] === team.profileFilter;
      }

      return true;
    });

    // Récupérer les noms des collaborateurs (colonne 1)
    const collaboratorNames = teamMembers.map(row => String(row[1] || '')).filter(name => name.trim() !== '');

    const collaboratorCount = teamMembers.length;
    const theoreticalCapacity = monthData.workingDays * collaboratorCount;

    // Compter les jours d'absence, interne, non-affecté et prévision
    let absenceDays = 0;
    let interneDays = 0;
    let nonAffectedDays = 0;
    let previsionDays = 0;

    teamMembers.forEach((row) => {
      for (let i = 5; i < row.length; i++) {
        const cellValue = String(row[i] || '');

        if (cellValue.includes('Absence')) {
          absenceDays += 0.5; // Chaque cellule = 1 demi-journée
        } else if (cellValue.includes('Interne')) {
          interneDays += 0.5;
        } else if (cellValue.includes('Non-Aff')) {
          nonAffectedDays += 0.5;
        } else if (cellValue.includes('Prévision')) {
          previsionDays += 0.5;
        }
      }
    });

    // Calcul des taux
    const realCapacity = theoreticalCapacity - absenceDays;

    // Taux estimé (prévision incluse) = (capacité théorique - absence - non-affecté) / (capacité théorique - absence)
    const estimatedRate = realCapacity > 0
      ? (theoreticalCapacity - absenceDays - nonAffectedDays) / realCapacity
      : 0;

    // Taux réel (hors prévision) = (capacité théorique - absence - non-affecté - prévision) / (capacité théorique - absence)
    const realRate = realCapacity > 0
      ? (theoreticalCapacity - absenceDays - nonAffectedDays - previsionDays) / realCapacity
      : 0;

    return {
      teamName: team.name,
      collaboratorCount,
      collaboratorNames,
      theoreticalCapacity,
      absenceDays,
      realRate,
      interneDays,
      nonAffectedDays,
      previsionDays,
      estimatedRate,
      
    };
  }

  /**
   * Récupère le nombre de jours ouvrés pour un mois donné
   * Utilise le calcul automatique basé sur le calendrier
   */
  getWorkingDays(monthName: string): number {
    return this.calculateWorkingDaysInMonth(monthName);
  }

  /**
   * Calcule le nombre de jours ouvrés à partir des données du sheet
   * En comptant les dates uniques dans la ligne des dates
   */
  calculateWorkingDaysFromData(sheetData: (string | number)[][]): number {
    if (sheetData.length < 2) return 0;

    const dateRow = sheetData[1]; // Ligne des dates
    const uniqueDates = new Set<string>();

    // Commencer à partir de la colonne 5 (index 5) car les 5 premières colonnes sont des infos
    for (let i = 5; i < dateRow.length; i++) {
      const cellValue = dateRow[i];
      // Si la cellule contient une date (nombre Excel ou string de date)
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        // Convertir en string pour pouvoir utiliser un Set
        const dateStr = String(cellValue);
        uniqueDates.add(dateStr);
      }
    }

    const workingDays = uniqueDates.size;
    console.log(`Calcul jours ouvrés: ${workingDays} dates uniques détectées sur ${dateRow.length - 5} colonnes`);
    return workingDays;
  }

  /**
   * Calcule les métriques par expertise (E-commerce / Sur mesure)
   */
  calculateExpertiseMetrics(monthData: MonthData): ExpertiseMetrics[] {
    const dataRows = monthData.sheetData.slice(3);
    const results: ExpertiseMetrics[] = [];

    // Helper function pour calculer les métriques d'une expertise
    const calculateForExpertise = (profile: string, expertise: string, name: string): ExpertiseMetrics => {
      const members = dataRows.filter(row =>
        row[4] === 'CDS' &&
        row[3] === profile &&
        row[2] === expertise
      );

      const collaboratorNames = members.map(row => String(row[1] || '')).filter(name => name.trim() !== '');
      const collaboratorCount = members.length;

      let absenceDays = 0;
      let nonAffectedDays = 0;
      let previsionDays = 0;

      members.forEach(row => {
        for (let i = 5; i < row.length; i++) {
          const cellValue = String(row[i] || '');
          if (cellValue.includes('Absence')) {
            absenceDays += 0.5;
          } else if (cellValue.includes('Non-Aff')) {
            nonAffectedDays += 0.5;
          } else if (cellValue.includes('Prévision')) {
            previsionDays += 0.5;
          }
        }
      });

      return {
        expertiseName: name,
        collaboratorCount,
        collaboratorNames,
        absenceDays,
        nonAffectedDays,
        previsionDays
      };
    };

    // Calculer pour chaque expertise
    results.push(calculateForExpertise('DEV FRONT', 'E-commerce', 'Front E-commerce'));
    results.push(calculateForExpertise('DEV FRONT', 'Sur mesure', 'Front Sur mesure'));
    results.push(calculateForExpertise('DEV BACK', 'E-commerce', 'Back E-commerce'));
    results.push(calculateForExpertise('DEV BACK', 'Sur mesure', 'Back Sur mesure'));

    return results;
  }

  /**
   * Calcule les métriques quotidiennes cumulatives pour un mois
   */
  calculateDailyMetrics(monthData: MonthData): DailyMetrics[] {
    const dataRows = monthData.sheetData.slice(3);
    const headerRow = monthData.sheetData[2]; // Ligne 3 contient les vraies dates (format numérique Excel)
    const results: DailyMetrics[] = [];

    // Compteurs cumulatifs
    let cumulativeWorkingDays = 0;
    let cumulativeAbsences = 0;
    let cumulativeInterne = 0;
    let cumulativeNonAffected = 0;
    let cumulativePrevision = 0;

    // Compteurs cumulatifs par expertise
    let cumulativeFrontEcommerceAbsences = 0;
    let cumulativeFrontEcommerceNonAffected = 0;
    let cumulativeFrontEcommercePrevision = 0;
    let cumulativeBackEcommerceAbsences = 0;
    let cumulativeBackEcommerceNonAffected = 0;
    let cumulativeBackEcommercePrevision = 0;
    let cumulativeFrontSurMesureAbsences = 0;
    let cumulativeFrontSurMesureNonAffected = 0;
    let cumulativeFrontSurMesurePrevision = 0;
    let cumulativeBackSurMesureAbsences = 0;
    let cumulativeBackSurMesureNonAffected = 0;
    let cumulativeBackSurMesurePrevision = 0;

    // Compter les collaborateurs par catégorie (constant pour tous les jours)
    const totalCDS = dataRows.filter(row => row[4] === 'CDS').length;
    const equipeFront = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV FRONT').length;
    const equipeBack = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV BACK').length;
    const equipeCdP = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'CdP').length;
    const equipeDesign = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'GRAPHISTE').length;
    const frontEcommerce = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV FRONT' && row[2] === 'E-commerce').length;
    const frontSurMesure = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV FRONT' && row[2] === 'Sur mesure').length;
    const backEcommerce = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV BACK' && row[2] === 'E-commerce').length;
    const backSurMesure = dataRows.filter(row => row[4] === 'CDS' && row[3] === 'DEV BACK' && row[2] === 'Sur mesure').length;

    // Extraire le mois et l'année du nom du mois (ex: "Octobre 2025")
    const monthParts = monthData.month.split(' ');
    const monthName = monthParts[0];
    const year = monthParts[1] || new Date().getFullYear();

    // Convertir le nom du mois en numéro
    const monthMap: { [key: string]: string } = {
      'Janvier': '01', 'Février': '02', 'Mars': '03', 'Avril': '04',
      'Mai': '05', 'Juin': '06', 'Juillet': '07', 'Août': '08',
      'Septembre': '09', 'Octobre': '10', 'Novembre': '11', 'Décembre': '12'
    };
    const monthNumber = monthMap[monthName] || '01';

    console.log(`[${monthName}] Début traitement - monthNumber=${monthNumber}, headerRow.length=${headerRow.length}`);

    // Parcourir les colonnes du sheet pour trouver les dates
    // Dans le sheet, chaque jour a 2 colonnes consécutives avec la même date (matin puis après-midi)
    // Les dates sont en format numérique Excel (ex: 45931 = 01/10/2025)

    let colIndex = 5; // Commencer à la colonne 5 (première colonne de dates)
    const maxIterations = 100; // Sécurité pour éviter boucle infinie
    let iterations = 0;
    let processedDays = 0;

    while (colIndex < headerRow.length && iterations < maxIterations) {
      iterations++;

      const dateValue = headerRow[colIndex];

      // Vérifier si c'est une date valide (nombre)
      if (typeof dateValue !== 'number' || !dateValue) {
        colIndex++;
        continue;
      }

      // Convertir le numéro Excel en date JavaScript
      // Excel compte les jours depuis le 1er janvier 1900
      const excelEpoch = new Date(1900, 0, 1);
      const convertedDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
      const dayOfMonth = convertedDate.getDate();
      const month = convertedDate.getMonth() + 1;

      if (monthName === 'Novembre') {
        console.log(`[${monthName}] colIndex=${colIndex}, dateValue=${dateValue}, convertedMonth=${String(month).padStart(2, '0')}, monthNumber=${monthNumber}, day=${dayOfMonth}`);
      }

      // Vérifier que c'est bien le bon mois
      if (String(month).padStart(2, '0') !== monthNumber) {
        colIndex++;
        continue;
      }

      // Vérifier que la colonne suivante a la même date (après-midi)
      const nextDateValue = headerRow[colIndex + 1];
      if (nextDateValue !== dateValue) {
        // Pas de colonne après-midi correspondante, skip
        if (monthName === 'Novembre') {
          console.log(`[${monthName}] SKIP: colonne suivante différente - nextDateValue=${nextDateValue}, dateValue=${dateValue}`);
        }
        colIndex++;
        continue;
      }

      const morningColIndex = colIndex;
      const afternoonColIndex = colIndex + 1;

      // Formater la date avec le jour séquentiel
      const day = String(dayOfMonth).padStart(2, '0');
      const dateBase = `${day}/${monthNumber}/${year}`;

      // Vérifier si c'est un jour ouvré
      const dayOfWeek = convertedDate.getDay(); // 0 = Dimanche, 6 = Samedi

      // Un jour est ouvré s'il n'est ni samedi ni dimanche
      const isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;

      // Skip weekends - ne pas ajouter aux résultats
      if (!isWorkingDay) {
        colIndex += 2; // Sauter les 2 colonnes du weekend
        continue;
      }

      // Calculer les métriques pour ce jour spécifique - séparées matin/après-midi
      // Dans le sheet, chaque jour a 2 colonnes : colonne matin et colonne après-midi
      let morningAbsences = 0, afternoonAbsences = 0;
      let morningInterne = 0, afternoonInterne = 0;
      let morningNonAffected = 0, afternoonNonAffected = 0;
      let morningPrevision = 0, afternoonPrevision = 0;

      let morningFrontEcommerceAbsences = 0, afternoonFrontEcommerceAbsences = 0;
      let morningFrontEcommerceNonAffected = 0, afternoonFrontEcommerceNonAffected = 0;
      let morningFrontEcommercePrevision = 0, afternoonFrontEcommercePrevision = 0;
      let morningBackEcommerceAbsences = 0, afternoonBackEcommerceAbsences = 0;
      let morningBackEcommerceNonAffected = 0, afternoonBackEcommerceNonAffected = 0;
      let morningBackEcommercePrevision = 0, afternoonBackEcommercePrevision = 0;
      let morningFrontSurMesureAbsences = 0, afternoonFrontSurMesureAbsences = 0;
      let morningFrontSurMesureNonAffected = 0, afternoonFrontSurMesureNonAffected = 0;
      let morningFrontSurMesurePrevision = 0, afternoonFrontSurMesurePrevision = 0;
      let morningBackSurMesureAbsences = 0, afternoonBackSurMesureAbsences = 0;
      let morningBackSurMesureNonAffected = 0, afternoonBackSurMesureNonAffected = 0;
      let morningBackSurMesurePrevision = 0, afternoonBackSurMesurePrevision = 0;

      // Parcourir toutes les lignes pour compter les métriques du matin
      dataRows.forEach(row => {
        const morningCellValue = String(row[morningColIndex] || '');
        const isCDS = row[4] === 'CDS';
        const profile = String(row[3] || '');
        const expertise = String(row[2] || '');

        if (!isCDS) return;

        // Métriques globales pour le matin
        if (morningCellValue.includes('Absence')) {
          morningAbsences += 1;
        } else if (morningCellValue.includes('Interne')) {
          morningInterne += 1;
        } else if (morningCellValue.includes('Non-Aff')) {
          morningNonAffected += 1;
        } else if (morningCellValue.includes('Prévision')) {
          morningPrevision += 1;
        }

        // Métriques par expertise pour le matin
        if (profile === 'DEV FRONT' && expertise === 'E-commerce') {
          if (morningCellValue.includes('Absence')) morningFrontEcommerceAbsences += 1;
          else if (morningCellValue.includes('Non-Aff')) morningFrontEcommerceNonAffected += 1;
          else if (morningCellValue.includes('Prévision')) morningFrontEcommercePrevision += 1;
        } else if (profile === 'DEV BACK' && expertise === 'E-commerce') {
          if (morningCellValue.includes('Absence')) morningBackEcommerceAbsences += 1;
          else if (morningCellValue.includes('Non-Aff')) morningBackEcommerceNonAffected += 1;
          else if (morningCellValue.includes('Prévision')) morningBackEcommercePrevision += 1;
        } else if (profile === 'DEV FRONT' && expertise === 'Sur mesure') {
          if (morningCellValue.includes('Absence')) morningFrontSurMesureAbsences += 1;
          else if (morningCellValue.includes('Non-Aff')) morningFrontSurMesureNonAffected += 1;
          else if (morningCellValue.includes('Prévision')) morningFrontSurMesurePrevision += 1;
        } else if (profile === 'DEV BACK' && expertise === 'Sur mesure') {
          if (morningCellValue.includes('Absence')) morningBackSurMesureAbsences += 1;
          else if (morningCellValue.includes('Non-Aff')) morningBackSurMesureNonAffected += 1;
          else if (morningCellValue.includes('Prévision')) morningBackSurMesurePrevision += 1;
        }
      });

      // Parcourir toutes les lignes pour compter les métriques de l'après-midi
      dataRows.forEach(row => {
        const afternoonCellValue = String(row[afternoonColIndex] || '');
        const isCDS = row[4] === 'CDS';
        const profile = String(row[3] || '');
        const expertise = String(row[2] || '');

        if (!isCDS) return;

        // Métriques globales pour l'après-midi
        if (afternoonCellValue.includes('Absence')) {
          afternoonAbsences += 1;
        } else if (afternoonCellValue.includes('Interne')) {
          afternoonInterne += 1;
        } else if (afternoonCellValue.includes('Non-Aff')) {
          afternoonNonAffected += 1;
        } else if (afternoonCellValue.includes('Prévision')) {
          afternoonPrevision += 1;
        }

        // Métriques par expertise pour l'après-midi
        if (profile === 'DEV FRONT' && expertise === 'E-commerce') {
          if (afternoonCellValue.includes('Absence')) afternoonFrontEcommerceAbsences += 1;
          else if (afternoonCellValue.includes('Non-Aff')) afternoonFrontEcommerceNonAffected += 1;
          else if (afternoonCellValue.includes('Prévision')) afternoonFrontEcommercePrevision += 1;
        } else if (profile === 'DEV BACK' && expertise === 'E-commerce') {
          if (afternoonCellValue.includes('Absence')) afternoonBackEcommerceAbsences += 1;
          else if (afternoonCellValue.includes('Non-Aff')) afternoonBackEcommerceNonAffected += 1;
          else if (afternoonCellValue.includes('Prévision')) afternoonBackEcommercePrevision += 1;
        } else if (profile === 'DEV FRONT' && expertise === 'Sur mesure') {
          if (afternoonCellValue.includes('Absence')) afternoonFrontSurMesureAbsences += 1;
          else if (afternoonCellValue.includes('Non-Aff')) afternoonFrontSurMesureNonAffected += 1;
          else if (afternoonCellValue.includes('Prévision')) afternoonFrontSurMesurePrevision += 1;
        } else if (profile === 'DEV BACK' && expertise === 'Sur mesure') {
          if (afternoonCellValue.includes('Absence')) afternoonBackSurMesureAbsences += 1;
          else if (afternoonCellValue.includes('Non-Aff')) afternoonBackSurMesureNonAffected += 1;
          else if (afternoonCellValue.includes('Prévision')) afternoonBackSurMesurePrevision += 1;
        }
      });

      // Créer 2 entrées par jour : Matin et Après-midi
      // Matin (première demi-journée)
      // Accumuler les absences du matin d'abord
      cumulativeAbsences += morningAbsences;
      cumulativeInterne += morningInterne;
      cumulativeNonAffected += morningNonAffected;
      cumulativePrevision += morningPrevision;
      cumulativeFrontEcommerceAbsences += morningFrontEcommerceAbsences;
      cumulativeFrontEcommerceNonAffected += morningFrontEcommerceNonAffected;
      cumulativeFrontEcommercePrevision += morningFrontEcommercePrevision;
      cumulativeBackEcommerceAbsences += morningBackEcommerceAbsences;
      cumulativeBackEcommerceNonAffected += morningBackEcommerceNonAffected;
      cumulativeBackEcommercePrevision += morningBackEcommercePrevision;
      cumulativeFrontSurMesureAbsences += morningFrontSurMesureAbsences;
      cumulativeFrontSurMesureNonAffected += morningFrontSurMesureNonAffected;
      cumulativeFrontSurMesurePrevision += morningFrontSurMesurePrevision;
      cumulativeBackSurMesureAbsences += morningBackSurMesureAbsences;
      cumulativeBackSurMesureNonAffected += morningBackSurMesureNonAffected;
      cumulativeBackSurMesurePrevision += morningBackSurMesurePrevision;

      cumulativeWorkingDays += 0.5; // Incrémenter de 0.5 pour la demi-journée du matin

      results.push({
        date: `${dateBase} Matin`,
        dayIndex: morningColIndex,
        isWorkingDay,
        cumulativeWorkingDays,
        totalCDS,
        equipeFront,
        frontEcommerce,
        frontSurMesure,
        equipeBack,
        backEcommerce,
        backSurMesure,
        equipeCdP,
        equipeDesign,
        // Valeurs NON cumulatives (uniquement pour cette demi-journée)
        absences: morningAbsences,
        interne: morningInterne,
        nonAffected: morningNonAffected,
        prevision: morningPrevision,
        // Valeurs cumulatives globales
        cumulativeAbsences,
        cumulativeInterne,
        cumulativeNonAffected,
        cumulativePrevision,
        // Valeurs NON cumulatives par expertise (pour cette demi-journée)
        frontEcommerceAbsences: morningFrontEcommerceAbsences,
        frontEcommerceNonAffected: morningFrontEcommerceNonAffected,
        frontEcommercePrevision: morningFrontEcommercePrevision,
        backEcommerceAbsences: morningBackEcommerceAbsences,
        backEcommerceNonAffected: morningBackEcommerceNonAffected,
        backEcommercePrevision: morningBackEcommercePrevision,
        frontSurMesureAbsences: morningFrontSurMesureAbsences,
        frontSurMesureNonAffected: morningFrontSurMesureNonAffected,
        frontSurMesurePrevision: morningFrontSurMesurePrevision,
        backSurMesureAbsences: morningBackSurMesureAbsences,
        backSurMesureNonAffected: morningBackSurMesureNonAffected,
        backSurMesurePrevision: morningBackSurMesurePrevision,
        // Valeurs CUMULATIVES par expertise
        cumulativeFrontEcommerceAbsences,
        cumulativeFrontEcommerceNonAffected,
        cumulativeFrontEcommercePrevision,
        cumulativeBackEcommerceAbsences,
        cumulativeBackEcommerceNonAffected,
        cumulativeBackEcommercePrevision,
        cumulativeFrontSurMesureAbsences,
        cumulativeFrontSurMesureNonAffected,
        cumulativeFrontSurMesurePrevision,
        cumulativeBackSurMesureAbsences,
        cumulativeBackSurMesureNonAffected,
        cumulativeBackSurMesurePrevision
      });

      // Après-midi (deuxième demi-journée)
      // Accumuler les absences de l'après-midi
      cumulativeAbsences += afternoonAbsences;
      cumulativeInterne += afternoonInterne;
      cumulativeNonAffected += afternoonNonAffected;
      cumulativePrevision += afternoonPrevision;
      cumulativeFrontEcommerceAbsences += afternoonFrontEcommerceAbsences;
      cumulativeFrontEcommerceNonAffected += afternoonFrontEcommerceNonAffected;
      cumulativeFrontEcommercePrevision += afternoonFrontEcommercePrevision;
      cumulativeBackEcommerceAbsences += afternoonBackEcommerceAbsences;
      cumulativeBackEcommerceNonAffected += afternoonBackEcommerceNonAffected;
      cumulativeBackEcommercePrevision += afternoonBackEcommercePrevision;
      cumulativeFrontSurMesureAbsences += afternoonFrontSurMesureAbsences;
      cumulativeFrontSurMesureNonAffected += afternoonFrontSurMesureNonAffected;
      cumulativeFrontSurMesurePrevision += afternoonFrontSurMesurePrevision;
      cumulativeBackSurMesureAbsences += afternoonBackSurMesureAbsences;
      cumulativeBackSurMesureNonAffected += afternoonBackSurMesureNonAffected;
      cumulativeBackSurMesurePrevision += afternoonBackSurMesurePrevision;

      cumulativeWorkingDays += 0.5; // Incrémenter de 0.5 pour la demi-journée de l'après-midi

      results.push({
        date: `${dateBase} Après-midi`,
        dayIndex: afternoonColIndex,
        isWorkingDay,
        cumulativeWorkingDays,
        totalCDS,
        equipeFront,
        frontEcommerce,
        frontSurMesure,
        equipeBack,
        backEcommerce,
        backSurMesure,
        equipeCdP,
        equipeDesign,
        // Valeurs NON cumulatives (uniquement pour cette demi-journée)
        absences: afternoonAbsences,
        interne: afternoonInterne,
        nonAffected: afternoonNonAffected,
        prevision: afternoonPrevision,
        // Valeurs cumulatives globales
        cumulativeAbsences,
        cumulativeInterne,
        cumulativeNonAffected,
        cumulativePrevision,
        // Valeurs NON cumulatives par expertise (pour cette demi-journée)
        frontEcommerceAbsences: afternoonFrontEcommerceAbsences,
        frontEcommerceNonAffected: afternoonFrontEcommerceNonAffected,
        frontEcommercePrevision: afternoonFrontEcommercePrevision,
        backEcommerceAbsences: afternoonBackEcommerceAbsences,
        backEcommerceNonAffected: afternoonBackEcommerceNonAffected,
        backEcommercePrevision: afternoonBackEcommercePrevision,
        frontSurMesureAbsences: afternoonFrontSurMesureAbsences,
        frontSurMesureNonAffected: afternoonFrontSurMesureNonAffected,
        frontSurMesurePrevision: afternoonFrontSurMesurePrevision,
        backSurMesureAbsences: afternoonBackSurMesureAbsences,
        backSurMesureNonAffected: afternoonBackSurMesureNonAffected,
        backSurMesurePrevision: afternoonBackSurMesurePrevision,
        // Valeurs CUMULATIVES par expertise
        cumulativeFrontEcommerceAbsences,
        cumulativeFrontEcommerceNonAffected,
        cumulativeFrontEcommercePrevision,
        cumulativeBackEcommerceAbsences,
        cumulativeBackEcommerceNonAffected,
        cumulativeBackEcommercePrevision,
        cumulativeFrontSurMesureAbsences,
        cumulativeFrontSurMesureNonAffected,
        cumulativeFrontSurMesurePrevision,
        cumulativeBackSurMesureAbsences,
        cumulativeBackSurMesureNonAffected,
        cumulativeBackSurMesurePrevision
      });

      // Passer aux 2 prochaines colonnes (sauter les 2 colonnes qu'on vient de traiter)
      colIndex += 2;
      processedDays++;
    }

    console.log(`[${monthName}] Fin traitement - processedDays=${processedDays}, iterations=${iterations}, results.length=${results.length}`);

    return results;
  }

  /**
   * Convertit les métriques d'équipe de demi-journées en jours entiers
   */
  calculateTeamMetricsInDays(monthData: MonthData): TeamMetrics[] {
    const halfDayMetrics = this.calculateTeamMetrics(monthData);
    return halfDayMetrics.map(metric => ({
      ...metric,
      absenceDays: metric.absenceDays / 2,
      nonAffectedDays: metric.nonAffectedDays / 2,
      previsionDays: metric.previsionDays / 2,
      interneDays: metric.interneDays / 2
    }));
  }

  /**
   * Convertit les métriques d'expertise de demi-journées en jours entiers
   */
  calculateExpertiseMetricsInDays(monthData: MonthData): ExpertiseMetrics[] {
    const halfDayMetrics = this.calculateExpertiseMetrics(monthData);
    return halfDayMetrics.map(metric => ({
      ...metric,
      absenceDays: metric.absenceDays / 2,
      nonAffectedDays: metric.nonAffectedDays / 2,
      previsionDays: metric.previsionDays / 2
    }));
  }

  /**
   * Calcule le taux d'activité réel pour l'équipe Front à partir des métriques quotidiennes
   * Taux = ((capacité réelle - non affecté - prévision) / capacité réelle) * 100
   */
  calculateFrontActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.equipeFront;
    const absences = dailyMetric.frontEcommerceAbsences + dailyMetric.frontSurMesureAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.frontEcommerceNonAffected + dailyMetric.frontSurMesureNonAffected;
    const prevision = dailyMetric.frontEcommercePrevision + dailyMetric.frontSurMesurePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour l'équipe Back à partir des métriques quotidiennes
   * Taux = ((capacité réelle - non affecté - prévision) / capacité réelle) * 100
   */
  calculateBackActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.equipeBack;
    const absences = dailyMetric.backEcommerceAbsences + dailyMetric.backSurMesureAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.backEcommerceNonAffected + dailyMetric.backSurMesureNonAffected;
    const prevision = dailyMetric.backEcommercePrevision + dailyMetric.backSurMesurePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour l'expertise E-commerce à partir des métriques quotidiennes
   * Taux = ((capacité réelle - non affecté - prévision) / capacité réelle) * 100
   */
  calculateEcommerceActivityRate(dailyMetric: DailyMetrics): number {
    const frontEcommerce = dailyMetric.frontEcommerce - dailyMetric.frontEcommerceAbsences;
    const backEcommerce = dailyMetric.backEcommerce - dailyMetric.backEcommerceAbsences;
    const totalEcommerce = frontEcommerce + backEcommerce;

    if (totalEcommerce <= 0) return 0;

    const nonAffecte = dailyMetric.frontEcommerceNonAffected + dailyMetric.backEcommerceNonAffected;
    const prevision = dailyMetric.frontEcommercePrevision + dailyMetric.backEcommercePrevision;
    const taux = ((totalEcommerce - nonAffecte - prevision) / totalEcommerce) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour l'expertise Sur mesure à partir des métriques quotidiennes
   * Taux = ((capacité réelle - non affecté - prévision) / capacité réelle) * 100
   */
  calculateSurMesureActivityRate(dailyMetric: DailyMetrics): number {
    const frontSurMesure = dailyMetric.frontSurMesure - dailyMetric.frontSurMesureAbsences;
    const backSurMesure = dailyMetric.backSurMesure - dailyMetric.backSurMesureAbsences;
    const totalSurMesure = frontSurMesure + backSurMesure;

    if (totalSurMesure <= 0) return 0;

    const nonAffecte = dailyMetric.frontSurMesureNonAffected + dailyMetric.backSurMesureNonAffected;
    const prevision = dailyMetric.frontSurMesurePrevision + dailyMetric.backSurMesurePrevision;
    const taux = ((totalSurMesure - nonAffecte - prevision) / totalSurMesure) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour E-commerce Front
   */
  calculateEcommerceFrontActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.frontEcommerce;
    const absences = dailyMetric.frontEcommerceAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.frontEcommerceNonAffected;
    const prevision = dailyMetric.frontEcommercePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour E-commerce Back
   */
  calculateEcommerceBackActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.backEcommerce;
    const absences = dailyMetric.backEcommerceAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.backEcommerceNonAffected;
    const prevision = dailyMetric.backEcommercePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour Sur mesure Front
   */
  calculateSurMesureFrontActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.frontSurMesure;
    const absences = dailyMetric.frontSurMesureAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.frontSurMesureNonAffected;
    const prevision = dailyMetric.frontSurMesurePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Calcule le taux d'activité réel pour Sur mesure Back
   */
  calculateSurMesureBackActivityRate(dailyMetric: DailyMetrics): number {
    const capaciteTheorique = dailyMetric.backSurMesure;
    const absences = dailyMetric.backSurMesureAbsences;
    const reelle = capaciteTheorique - absences;

    if (reelle <= 0) return 0;

    const nonAffecte = dailyMetric.backSurMesureNonAffected;
    const prevision = dailyMetric.backSurMesurePrevision;
    const taux = ((reelle - nonAffecte - prevision) / reelle) * 100;

    return Math.round(taux * 100) / 100;
  }

  /**
   * Agrège les métriques quotidiennes pour obtenir un taux moyen par jour complet (matin + après-midi)
   * Les dailyMetrics contiennent 2 entrées par jour (matin et après-midi)
   * Cette méthode groupe par jour et calcule la moyenne des taux d'activité
   */
  aggregateDailyMetrics(dailyMetrics: DailyMetrics[]): {
    date: string;
    frontRate: number;
    backRate: number;
    ecommerceRate: number;
    surMesureRate: number;
    ecommerceFrontRate: number;
    ecommerceBackRate: number;
    surMesureFrontRate: number;
    surMesureBackRate: number;
  }[] {
    const dayGroups = new Map<string, DailyMetrics[]>();

    // Grouper par date (enlever "Matin" ou "Après-midi")
    dailyMetrics.forEach(metric => {
      const dateBase = metric.date.replace(/ (Matin|Après-midi)$/, '');
      if (!dayGroups.has(dateBase)) {
        dayGroups.set(dateBase, []);
      }
      dayGroups.get(dateBase)!.push(metric);
    });

    // Calculer la moyenne des taux pour chaque jour complet
    const result: {
      date: string;
      frontRate: number;
      backRate: number;
      ecommerceRate: number;
      surMesureRate: number;
      ecommerceFrontRate: number;
      ecommerceBackRate: number;
      surMesureFrontRate: number;
      surMesureBackRate: number;
    }[] = [];

    dayGroups.forEach((metrics, date) => {
      const frontRates = metrics.map(m => this.calculateFrontActivityRate(m));
      const backRates = metrics.map(m => this.calculateBackActivityRate(m));
      const ecommerceRates = metrics.map(m => this.calculateEcommerceActivityRate(m));
      const surMesureRates = metrics.map(m => this.calculateSurMesureActivityRate(m));
      const ecommerceFrontRates = metrics.map(m => this.calculateEcommerceFrontActivityRate(m));
      const ecommerceBackRates = metrics.map(m => this.calculateEcommerceBackActivityRate(m));
      const surMesureFrontRates = metrics.map(m => this.calculateSurMesureFrontActivityRate(m));
      const surMesureBackRates = metrics.map(m => this.calculateSurMesureBackActivityRate(m));

      result.push({
        date,
        frontRate: Math.round((frontRates.reduce((a, b) => a + b, 0) / frontRates.length) * 100) / 100,
        backRate: Math.round((backRates.reduce((a, b) => a + b, 0) / backRates.length) * 100) / 100,
        ecommerceRate: Math.round((ecommerceRates.reduce((a, b) => a + b, 0) / ecommerceRates.length) * 100) / 100,
        surMesureRate: Math.round((surMesureRates.reduce((a, b) => a + b, 0) / surMesureRates.length) * 100) / 100,
        ecommerceFrontRate: Math.round((ecommerceFrontRates.reduce((a, b) => a + b, 0) / ecommerceFrontRates.length) * 100) / 100,
        ecommerceBackRate: Math.round((ecommerceBackRates.reduce((a, b) => a + b, 0) / ecommerceBackRates.length) * 100) / 100,
        surMesureFrontRate: Math.round((surMesureFrontRates.reduce((a, b) => a + b, 0) / surMesureFrontRates.length) * 100) / 100,
        surMesureBackRate: Math.round((surMesureBackRates.reduce((a, b) => a + b, 0) / surMesureBackRates.length) * 100) / 100
      });
    });

    return result;
  }

  /**
   * Calcule le résumé mensuel des taux d'activité à partir des métriques quotidiennes
   * Retourne la moyenne des taux d'activité réel par équipe et par expertise pour tout le mois
   */
  calculateMonthlySummary(dailyMetrics: DailyMetrics[]): {
    frontRate: number;
    backRate: number;
    ecommerceRate: number;
    surMesureRate: number;
  } {
    if (!dailyMetrics || dailyMetrics.length === 0) {
      return {
        frontRate: 0,
        backRate: 0,
        ecommerceRate: 0,
        surMesureRate: 0
      };
    }

    // Calculer les taux pour chaque demi-journée
    const frontRates = dailyMetrics.map(m => this.calculateFrontActivityRate(m));
    const backRates = dailyMetrics.map(m => this.calculateBackActivityRate(m));
    const ecommerceRates = dailyMetrics.map(m => this.calculateEcommerceActivityRate(m));
    const surMesureRates = dailyMetrics.map(m => this.calculateSurMesureActivityRate(m));

    // Calculer la moyenne pour le mois
    return {
      frontRate: Math.round((frontRates.reduce((a, b) => a + b, 0) / frontRates.length) * 100) / 100,
      backRate: Math.round((backRates.reduce((a, b) => a + b, 0) / backRates.length) * 100) / 100,
      ecommerceRate: Math.round((ecommerceRates.reduce((a, b) => a + b, 0) / ecommerceRates.length) * 100) / 100,
      surMesureRate: Math.round((surMesureRates.reduce((a, b) => a + b, 0) / surMesureRates.length) * 100) / 100
    };
  }
}

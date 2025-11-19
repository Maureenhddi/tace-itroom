import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TableRow, CellValue } from '../../models/table-data.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent {
  @Input() set data(value: TableRow[]) {
    this._data = value;
    this.initializeCollapsedSections();
  }
  get data(): TableRow[] {
    return this._data;
  }
  private _data: TableRow[] = [];

  @Input() displayedColumns: string[] = [];
  @Input() headers: string[] = [];
  @Input() loading: boolean = false;

  // État des sections repliées/dépliées (par défaut toutes repliées pour afficher uniquement les TACE)
  collapsedSections: Set<string> = new Set();

  constructor(private cdr: ChangeDetectorRef) {}

  /**
   * Initialise toutes les sections comme repliées par défaut
   */
  private initializeCollapsedSections(): void {
    this._data.forEach(row => {
      if (row.isCollapsible && row.sectionId) {
        this.collapsedSections.add(row.sectionId);
      }
    });
  }

  /**
   * Get column header from headers array
   */
  getColumnHeader(column: string): string {
    const index = parseInt(column.replace('col', ''), 10);
    // Si pas de header, retourner vide au lieu du nom de colonne par défaut
    return this.headers[index] || '';
  }

  /**
   * Vérifie si une cellule contient un taux d'activité réel (un pourcentage)
   */
  isActivityRate(value: CellValue): boolean {
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    const strValue = String(value).trim();
    // Vérifie si c'est un nombre avec ou sans le symbole % (avec ou sans espace)
    return /^\d+(\.\d+)?\s*%?$/.test(strValue);
  }

  /**
   * Retourne la classe CSS en fonction du taux d'activité
   * - good: >= 85%
   * - average: 70% - 84%
   * - low: < 70%
   */
  getRateClass(value: CellValue): string {
    if (!this.isActivityRate(value)) return '';

    const numValue = parseFloat(String(value).replace('%', ''));

    if (numValue >= 85) return 'rate-good';
    if (numValue >= 70) return 'rate-average';
    return 'rate-low';
  }

  /**
   * Vérifie si la colonne contient des données de taux d'activité
   */
  isActivityRateColumn(column: string): boolean {
    const header = this.getColumnHeader(column).toLowerCase();
    return header.includes('taux') || header.includes('activité');
  }

  /**
   * Toggle l'état de collapse d'une section
   */
  toggleSection(sectionId: string | undefined): void {
    if (!sectionId) return;

    if (this.collapsedSections.has(sectionId)) {
      this.collapsedSections.delete(sectionId);
    } else {
      this.collapsedSections.add(sectionId);
    }

    // Forcer Angular à détecter les changements
    this.cdr.detectChanges();
  }

  /**
   * Vérifie si une section est repliée
   */
  isSectionCollapsed(sectionId: string | undefined): boolean {
    return sectionId ? this.collapsedSections.has(sectionId) : false;
  }

  /**
   * Vérifie si une ligne doit être affichée (gère le collapse)
   */
  shouldShowRow(row: TableRow): boolean {
    // Si c'est une ligne de titre, toujours afficher
    if (row.isTitleRow) {
      return true;
    }

    // Si c'est une ligne collapsible (le taux réel), toujours afficher
    if (row.isCollapsible) {
      return true;
    }

    // Si c'est une ligne de taux (isRateRow), toujours afficher (même si c'est une detailRow)
    if (row.isRateRow) {
      return true;
    }

    // Si c'est une ligne de détail, vérifier si sa section est repliée
    if (row.isDetailRow && row.sectionId) {
      return !this.isSectionCollapsed(row.sectionId);
    }

    // Par défaut, afficher la ligne
    return true;
  }

  /**
   * Récupère les données filtrées selon l'état de collapse
   */
  getVisibleData(): TableRow[] {
    return this.data.filter(row => this.shouldShowRow(row));
  }
}

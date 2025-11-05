import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { TableRow, CellValue } from '../../models/table-data.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent {
  @Input() data: TableRow[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() headers: string[] = [];
  @Input() loading: boolean = false;

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
}

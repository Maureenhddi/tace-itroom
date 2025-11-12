/**
 * Types for table data and headers
 */

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
  isCustomRow?: boolean;
  isSubRow?: boolean;
  isTitleRow?: boolean;
  isRateRow?: boolean; // Pour mettre en avant les lignes de taux d'activité
}

export interface TableHeader {
  key: string;
  label: string;
  sortable?: boolean;
}

export type CellValue = string | number | boolean | null | undefined;

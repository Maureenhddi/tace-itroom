/**
 * Types for table data and headers
 */

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
  isCustomRow?: boolean;
  isSubRow?: boolean;
  isTitleRow?: boolean;
  isRateRow?: boolean; // Pour mettre en avant les lignes de taux d'activité
  isCollapsible?: boolean; // Indique que cette ligne peut être repliée/dépliée
  sectionId?: string; // ID unique de la section pour gérer le collapse
  isDetailRow?: boolean; // Indique que c'est une ligne de détail (peut être cachée)
}

export interface TableHeader {
  key: string;
  label: string;
  sortable?: boolean;
}

export type CellValue = string | number | boolean | null | undefined;

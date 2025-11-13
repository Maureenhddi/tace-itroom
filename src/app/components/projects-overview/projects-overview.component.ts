import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ProjectStatistics } from '../../services/activity-rate.service';

@Component({
  selector: 'app-projects-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSortModule
  ],
  templateUrl: './projects-overview.component.html',
  styleUrl: './projects-overview.component.scss'
})
export class ProjectsOverviewComponent implements OnChanges {
  @Input() projectStats: ProjectStatistics[] = [];
  @Input() month: string = '';

  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['projectName', 'totalDays', 'frontDays', 'backDays', 'cdpDays', 'designDays'];

  dataSource: MatTableDataSource<ProjectStatistics> = new MatTableDataSource<ProjectStatistics>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectStats']) {
      this.updateDataSource();
    }
  }

  /**
   * Met à jour la source de données avec les projets du mois
   */
  private updateDataSource(): void {
    // Trier par totalDays décroissant
    const sortedProjects = [...this.projectStats].sort((a, b) => b.totalDays - a.totalDays);

    this.dataSource = new MatTableDataSource(sortedProjects);
    this.dataSource.sort = this.sort;
  }

  /**
   * Calcule le pourcentage
   */
  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Retourne les statistiques globales pour le mois
   */
  get globalStats() {
    if (this.projectStats.length === 0) {
      return {
        totalProjects: 0,
        totalDays: 0,
        totalFront: 0,
        totalBack: 0,
        totalCdp: 0,
        totalDesign: 0
      };
    }

    return {
      totalProjects: this.projectStats.length,
      totalDays: this.projectStats.reduce((sum, p) => sum + p.totalDays, 0),
      totalFront: this.projectStats.reduce((sum, p) => sum + p.frontDays, 0),
      totalBack: this.projectStats.reduce((sum, p) => sum + p.backDays, 0),
      totalCdp: this.projectStats.reduce((sum, p) => sum + p.cdpDays, 0),
      totalDesign: this.projectStats.reduce((sum, p) => sum + p.designDays, 0)
    };
  }
}

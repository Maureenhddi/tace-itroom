import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  planChargeUrl: string = '';
  defaultUrl: string = 'https://docs.google.com/spreadsheets/d/1suMIbECtA9dZOJbYtXqUb9eItjlQaZOE1yPCwFwDBCo/edit?gid=0#gid=0';

  constructor(
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.planChargeUrl = this.configService.getPlanChargeUrl();
  }

  savePlanChargeUrl() {
    if (!this.planChargeUrl.trim()) {
      this.snackBar.open('L\'URL ne peut pas être vide', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Valider que c'est une URL Google Sheets
    if (!this.planChargeUrl.includes('docs.google.com/spreadsheets')) {
      this.snackBar.open('L\'URL doit être un lien Google Sheets valide', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.configService.setPlanChargeUrl(this.planChargeUrl);
    this.snackBar.open('URL du plan de charge mise à jour avec succès', 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  resetToDefault() {
    this.planChargeUrl = this.defaultUrl;
    this.configService.setPlanChargeUrl(this.defaultUrl);
    this.snackBar.open('URL réinitialisée à la valeur par défaut', 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
}

import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ''
  },
  {
    path: 'admin',
    component: AdminComponent
  }
];

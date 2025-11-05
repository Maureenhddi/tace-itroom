import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private isDarkModeSubject: BehaviorSubject<boolean>;

  constructor() {
    // Récupérer le thème depuis localStorage ou utiliser le thème système
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    this.isDarkModeSubject = new BehaviorSubject<boolean>(isDark);
    this.applyTheme(isDark);
  }

  get isDarkMode$(): Observable<boolean> {
    return this.isDarkModeSubject.asObservable();
  }

  get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkModeSubject.value;
    this.setTheme(newTheme);
  }

  setTheme(isDark: boolean): void {
    this.isDarkModeSubject.next(isDark);
    this.applyTheme(isDark);
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

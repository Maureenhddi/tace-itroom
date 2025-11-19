import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-loader.component.html',
  styleUrl: './skeleton-loader.component.scss'
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'table' | 'chart' | 'dashboard' = 'card';
  @Input() count: number = 1;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}

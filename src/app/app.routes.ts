import { Routes } from '@angular/router';
import { ThreePortfolioComponent } from './three-portfolio/three-portfolio.component/three-portfolio.component';

export const routes: Routes = [
  { path: '', component: ThreePortfolioComponent },
  { path: '**', redirectTo: '' }
];

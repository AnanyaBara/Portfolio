import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app/app.routes';
import { ThreePortfolioComponent } from './app/three-portfolio/three-portfolio.component/three-portfolio.component';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';

if (environment.production) enableProdMode();

bootstrapApplication(ThreePortfolioComponent, {
  providers: [provideRouter(routes), provideHttpClient()]
}).catch(err => console.error(err));

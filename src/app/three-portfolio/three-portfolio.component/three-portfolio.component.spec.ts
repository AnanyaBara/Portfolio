import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreePortfolioComponent } from './three-portfolio.component';

describe('ThreePortfolioComponent', () => {
  let component: ThreePortfolioComponent;
  let fixture: ComponentFixture<ThreePortfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreePortfolioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreePortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

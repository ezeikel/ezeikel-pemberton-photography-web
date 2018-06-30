import { TestBed, async, ComponentFixture } from '@angular/core/testing';

import { HeroCarouselComponent } from './hero-carousel.component';

describe('FooterComponent', () => {
  let component: HeroCarouselComponent;
  let fixture: ComponentFixture<HeroCarouselComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        HeroCarouselComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroCarouselComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

import { TestBed, ComponentFixture } from "@angular/core/testing";

import { HeroCarouselComponent } from "./hero-carousel.component";
import { ContentfulService } from "../services/contentful.service";

describe(`HeroCarouselComponent`, () => {
  let component: HeroCarouselComponent;
  let fixture: ComponentFixture<HeroCarouselComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      declarations: [HeroCarouselComponent],
      providers: [ContentfulService],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroCarouselComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

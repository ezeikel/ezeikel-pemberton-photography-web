import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';
import { HeroCarouselComponent } from '../hero-carousel/hero-carousel.component';
import { ScrollDownComponent } from '../scroll-down/scroll-down.component';
import { BlogPreviewComponent } from '../blog-preview/blog-preview.component';

describe('FooterComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        HomeComponent,
        HeroCarouselComponent,
        ScrollDownComponent,
        BlogPreviewComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

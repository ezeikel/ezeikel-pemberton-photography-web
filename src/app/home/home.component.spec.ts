import { TestBed, ComponentFixture } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { environment } from "../../environments/environment";

import { HomeComponent } from "./home.component";
import { HeroCarouselComponent } from "../hero-carousel/hero-carousel.component";
import { ScrollDownComponent } from "../scroll-down/scroll-down.component";
import { BlogPreviewComponent } from "../blog-preview/blog-preview.component";
import { AngularFireModule } from "angularfire2";
import { FirebaseService } from "../services/firebase.service";
import { AngularFireDatabase } from "angularfire2/database";
import { AngularFireStorage } from "angularfire2/storage";

describe(`HomeComponent`, () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AngularFireModule.initializeApp(environment.firebase),
      ],
      declarations: [
        HomeComponent,
        HeroCarouselComponent,
        ScrollDownComponent,
        BlogPreviewComponent,
      ],
      providers: [FirebaseService, AngularFireDatabase, AngularFireStorage],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

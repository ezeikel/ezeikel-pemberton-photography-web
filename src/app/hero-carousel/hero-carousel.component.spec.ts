import { TestBed, ComponentFixture } from "@angular/core/testing";
import { environment } from "../../environments/environment";

import { HeroCarouselComponent } from "./hero-carousel.component";
import { AngularFireModule } from "angularfire2";
import { FirebaseService } from "../services/firebase.service";
import { AngularFireDatabase } from "angularfire2/database";
import { AngularFireStorage } from "angularfire2/storage";

describe(`HeroCarouselComponent`, () => {
  let component: HeroCarouselComponent;
  let fixture: ComponentFixture<HeroCarouselComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AngularFireModule.initializeApp(environment.firebase)],
      declarations: [HeroCarouselComponent],
      providers: [FirebaseService, AngularFireDatabase, AngularFireStorage],
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

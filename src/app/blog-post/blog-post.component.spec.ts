import { TestBed, ComponentFixture } from "@angular/core/testing";
import { environment } from "../../environments/environment";

import { BlogPostComponent } from "./blog-post.component";
import { RouterTestingModule } from "@angular/router/testing";
import { AngularFireModule } from "angularfire2";
import { FirebaseService } from "../services/firebase.service";
import { AngularFireDatabase } from "angularfire2/database";
import { AngularFireStorage } from "angularfire2/storage";

describe(`BlogPostComponent`, () => {
  let component: BlogPostComponent;
  let fixture: ComponentFixture<BlogPostComponent>;
  let de, element;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AngularFireModule.initializeApp(environment.firebase),
      ],
      declarations: [BlogPostComponent],
      providers: [FirebaseService, AngularFireDatabase, AngularFireStorage],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

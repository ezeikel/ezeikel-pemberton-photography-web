import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { environment } from '../../environments/environment';

import { BlogPreviewComponent } from './blog-preview.component';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularFireModule } from 'angularfire2';
import { FirebaseService } from '../services/firebase.service';
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireStorage } from 'angularfire2/storage';

describe('BlogPreviewComponent', () => {
  let component: BlogPreviewComponent;
  let fixture: ComponentFixture<BlogPreviewComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AngularFireModule.initializeApp(environment.firebase)
      ],
      declarations: [
        BlogPreviewComponent
      ],
      providers: [ 
        FirebaseService,
        AngularFireDatabase,
        AngularFireStorage
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPreviewComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', (() => {
    expect(component).toBeTruthy();
  }));

});

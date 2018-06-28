import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { FirebaseApp, AngularFireModule } from 'angularFire2';

import { environment } from '../../environments/environment';

import { BlogPostComponent } from './blog-post.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

describe('BlogPostComponent', () => {
  let component: BlogPostComponent;
  let fixture: ComponentFixture<BlogPostComponent>;
  let de, element;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        AngularFireModule.initializeApp(environment.firebase)
      ],
      declarations: [
        BlogPostComponent,
        HeaderComponent,
        FooterComponent
      ],
      providers: [ FirebaseApp ]
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

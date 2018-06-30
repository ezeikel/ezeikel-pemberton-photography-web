import { TestBed, async, ComponentFixture } from '@angular/core/testing';

import { BlogPostComponent } from './blog-post.component';

import { FirebaseService } from '../services/firebase.service';

describe('BlogPostComponent', () => {
  let component: BlogPostComponent;
  let fixture: ComponentFixture<BlogPostComponent>;
  let firebaseService: FirebaseService;
  let de, element;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        BlogPostComponent
      ],
      providers: [ 
        FirebaseService 
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostComponent);
    firebaseService = TestBed.get(FirebaseService);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

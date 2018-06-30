import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { BlogPreviewComponent } from './blog-preview.component';
import { FirebaseService } from '../services/firebase.service';

describe('BlogPreviewComponent', () => {
  let component: BlogPreviewComponent;
  let fixture: ComponentFixture<BlogPreviewComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        BlogPreviewComponent
      ],
      providers: [ FirebaseService ]
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPreviewComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AngularFireModule } from 'angularfire2';

import { BlogPreviewComponent } from './blog-preview.component';

describe('BlogPreviewComponent', () => {
  let component: BlogPreviewComponent;
  let fixture: ComponentFixture<BlogPreviewComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AngularFireModule
      ],
      declarations: [
        BlogPreviewComponent
      ]
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

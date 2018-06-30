import { TestBed, async, ComponentFixture } from '@angular/core/testing';

import { HeroHeaderComponent } from './hero-header.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('HeroHeader', () => {
  let component: HeroHeaderComponent;
  let fixture: ComponentFixture<HeroHeaderComponent>;
  let de, element;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        HeroHeaderComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroHeaderComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

});

import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { FooterComponent } from './footer.component';
import { DebugElement } from '@angular/core';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let de, element;

  const year = (new Date()).getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        FooterComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance; // to access properties and methods
    element = fixture.nativeElement; // to access DOM element
    de = fixture.debugElement; // test helper

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

  it('should have year property', async(() => {
    expect(component.year).toBeTruthy();
  }));

  it(`after view load, year should be equal to '${year}'`, async(() => {
    expect(component.year).toEqual(year);
  }));

  it(`should render '${year}' inside of .footer__copyright element`, async(() => {
    expect(element.querySelector('.footer__copyright').textContent).toContain(year);
    expect(de.query(By.css('.footer__copyright')).nativeElement.innerText).toContain(year);
  }));
});

import { TestBed, async, ComponentFixture } from "@angular/core/testing";
import { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";

import { ScrollDownComponent } from "./scroll-down.component";

describe(`ScrollDownComponent`, () => {
  let component: ScrollDownComponent;
  let fixture: ComponentFixture<ScrollDownComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ScrollDownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScrollDownComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it(`should be created`, async(() => {
    expect(component).toBeTruthy();
  }));
});

import { TestBed, async, ComponentFixture } from "@angular/core/testing";

import { HeaderComponent } from "./header.component";
import { RouterTestingModule } from "@angular/router/testing";

describe(`HeaderComponent`, () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [HeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it(`should be created`, async(() => {
    expect(component).toBeTruthy();
  }));
});

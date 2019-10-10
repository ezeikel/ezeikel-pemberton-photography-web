import { TestBed, async, ComponentFixture } from "@angular/core/testing";
import { environment } from "../../environments/environment";

import { LatestUpdatesComponent } from "./latest-updates.component";
import { RouterTestingModule } from "@angular/router/testing";
import { ContentfulService } from "../services/contentful.service";

describe(`LatestUpdatesComponent`, () => {
  let component: LatestUpdatesComponent;
  let fixture: ComponentFixture<LatestUpdatesComponent>;
  let de, element;

  const year = new Date().getFullYear();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [LatestUpdatesComponent],
      providers: [ContentfulService],
    }).compileComponents();

    fixture = TestBed.createComponent(LatestUpdatesComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

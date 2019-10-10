import { TestBed, ComponentFixture } from "@angular/core/testing";
import { environment } from "../../environments/environment";

import { BlogComponent } from "./blog.component";
import { RouterTestingModule } from "@angular/router/testing";
import { ContentfulService } from "../services/contentful.service";
import { BlogPreviewComponent } from "../blog-preview/blog-preview.component";

describe(`BlogComponent`, () => {
  let component: BlogComponent;
  let fixture: ComponentFixture<BlogComponent>;
  let de, element;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [BlogComponent, BlogPreviewComponent],
      providers: [ContentfulService],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

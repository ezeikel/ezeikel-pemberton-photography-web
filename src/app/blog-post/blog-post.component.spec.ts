import { TestBed, ComponentFixture } from "@angular/core/testing";
import { environment } from "../../environments/environment";

import { BlogPostComponent } from "./blog-post.component";
import { RouterTestingModule } from "@angular/router/testing";
import { ContentfulService } from "../services/contentful.service";

describe(`BlogPostComponent`, () => {
  let component: BlogPostComponent;
  let fixture: ComponentFixture<BlogPostComponent>;
  let de, element;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [BlogPostComponent],
      providers: [ContentfulService],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

  it(`should be created`, () => {
    expect(component).toBeTruthy();
  });
});

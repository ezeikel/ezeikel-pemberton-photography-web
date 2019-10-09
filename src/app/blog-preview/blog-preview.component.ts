import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-blog-preview`,
  templateUrl: `./blog-preview.component.html`,
  styleUrls: [`./blog-preview.component.scss`],
})
export class BlogPreviewComponent implements OnInit {
  public previews: Array<any>;
  public title: string; // TODO: Do i need this?

  constructor(private _contentfulService: ContentfulService) {}

  public ngOnInit() {
    // TODO: query to Contenful for all blog posts. Pagination?
    this._contentfulService
      .getBlogPreviews()
      .subscribe(({ title, previews }) => {
        this.previews = previews;
        this.title = title;
      });
  }
}

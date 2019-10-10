import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-blog-preview`,
  templateUrl: `./blog-preview.component.html`,
  styleUrls: [`./blog-preview.component.scss`],
})
export class BlogPreviewComponent implements OnInit {
  public previews: Array<any>;

  constructor(private _contentfulService: ContentfulService) {}

  public ngOnInit() {
    // TODO: Pagination?
    this._contentfulService
      .getBlogPreviews({
        order: `-fields.date`,
      })
      .subscribe(({ previews }) => {
        this.previews = previews;
      });
  }
}

import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-latest-updates`,
  templateUrl: `./latest-updates.component.html`,
  styleUrls: [`./latest-updates.component.scss`],
})
export class LatestUpdatesComponent implements OnInit {
  public previews: Array<any>;
  public title: string;

  constructor(private _contentfulService: ContentfulService) {}

  public ngOnInit() {
    // TODO: query to Contenful for last three blog posts?
    this._contentfulService
      .getBlogPreviews()
      .subscribe(({ title, previews }) => {
        this.previews = previews;
        this.title = title;
      });
  }
}

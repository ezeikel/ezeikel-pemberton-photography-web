import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-latest-updates`,
  templateUrl: `./latest-updates.component.html`,
  styleUrls: [`./latest-updates.component.scss`],
})
export class LatestUpdatesComponent implements OnInit {
  public previews: Array<any>;

  constructor(private _contentfulService: ContentfulService) {}

  public ngOnInit() {
    this._contentfulService
      .getBlogPreviews({
        order: `-fields.date`,
        limit: 3,
      })
      .subscribe(({ previews }) => {
        this.previews = previews;
      });
  }
}

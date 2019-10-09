import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-details`,
  templateUrl: `./details.component.html`,
  styleUrls: [`./details.component.scss`],
})
export class DetailsComponent implements OnInit {
  public details: string[];
  constructor(private _contentfulService: ContentfulService) {}

  ngOnInit() {
    this._contentfulService
      .getDetails()
      .subscribe(details => (this.details = details));
  }
}

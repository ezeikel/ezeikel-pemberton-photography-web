import { Component, OnInit } from "@angular/core";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: "ep-photography-hero-carousel",
  templateUrl: "./hero-carousel.component.html",
  styleUrls: ["./hero-carousel.component.scss"]
})
export class HeroCarouselComponent implements OnInit {
  public slides: string[];

  constructor(private _contentfulService: ContentfulService) {}

  ngOnInit() {
    this._contentfulService
      .getCarouselImages()
      .subscribe(slides => (this.slides = slides));
  }
}

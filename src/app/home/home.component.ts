import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { skipWhile, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: "ep-photography-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private _unsubscribe$ = new Subject();

  constructor(
    private _route: ActivatedRoute,
    private _contentfulService: ContentfulService
  ) {}

  public ngOnInit() {
    this._contentfulService.getCarouselImages().then(images => {
      console.log({ images });
      debugger;
    });
  }

  public ngAfterViewInit() {
    // listen to route fragment changes and scroll to position
    this._route.fragment
      .pipe(takeUntil(this._unsubscribe$))
      .pipe(skipWhile(f => f === null || f === undefined))
      .subscribe(f => {
        const element: any = document.querySelector(f ? `#${f}` : "body");

        if (element) {
          this._scrollTo(element);
        }
      });
  }

  public ngOnDestroy() {
    this._unsubscribe$.next();
    this._unsubscribe$.complete();
  }

  private _scrollTo(element) {
    window.scrollTo({
      top: element.offsetTop,
      behavior: "smooth"
    });
  }
}

import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { mergeMap, skipWhile, takeUntil } from "rxjs/operators";
import { ContentfulService } from "../services/contentful.service";

@Component({
  selector: `ep-photography-blog-post`,
  templateUrl: `./blog-post.component.html`,
  styleUrls: [`./blog-post.component.scss`],
})
export class BlogPostComponent implements OnInit, OnDestroy {
  public post: any;
  private _unsubscribe = new Subject();

  constructor(
    private _contentfulService: ContentfulService,
    private _route: ActivatedRoute,
  ) {}

  public ngOnInit() {
    this._route.params
      .pipe(takeUntil(this._unsubscribe))
      .pipe(skipWhile(params => params[`post`] === undefined))
      .pipe(
        mergeMap(params =>
          this._contentfulService.getBlogPost({
            "fields.slug[match]": params[`post`],
          }),
        ),
      )
      .pipe(skipWhile(post => post === undefined))
      .subscribe(post => (this.post = post));
  }

  public ngOnDestroy() {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }
}

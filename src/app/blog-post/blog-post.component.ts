import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { mergeMap, skipWhile, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'ep-photography-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  public collection: string;
  public url: any;
  private _unsubscribe = new Subject();

  constructor(
    private _firebaseService: FirebaseService,
    private _route: ActivatedRoute
  ) {}

  public ngOnInit() {
    this._route
      .params
      .pipe(skipWhile(params => params['post'] === undefined))
      .pipe(mergeMap(params => this._firebaseService.getGalleryPreview(params['post'])))
      .pipe(takeUntil(this._unsubscribe))
      .subscribe(url => {
        this.url = url
      });
  }

  public ngOnDestroy() {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { skipWhile, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'ep-photography-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private _unsubscribe$ = new Subject();

  constructor(private _route: ActivatedRoute) {}

  public ngOnInit() {

  }

  public ngAfterViewInit() {
    // listen to route fragment changes and scroll to position
    this._route
      .fragment
      .pipe(takeUntil(this._unsubscribe$))
      .pipe(skipWhile(f => f === null))
      .subscribe(f => {
        const element: any = document.querySelector(f ? `#${f}` : 'body');

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
      behavior: 'smooth'
    });
  }
}

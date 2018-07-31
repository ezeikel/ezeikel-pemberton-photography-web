import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { skipWhile, takeUntil, switchMap } from 'rxjs/operators';
import { Subject, fromEvent } from 'rxjs';

@Component({
  selector: 'ep-photography-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private _unsubscribe$ = new Subject();

  constructor(private _location: Location, private _router: Router, private _route: ActivatedRoute) {}

  public ngOnInit() {
    // listen to route fragment changes and scroll to position
    this._route
      .fragment
      .pipe(takeUntil(this._unsubscribe$))
      .pipe(skipWhile(f => f === null))
      .subscribe(f => {
        const element: any = document.querySelector(f ? `#${f}` : 'body');

        if (element) {
          window.scrollTo({
            top: element.offsetTop,
            behavior: 'smooth'
          });
        }

      });

    // TODO: This not working correctly
    // clear fragment from url

    // fromEvent(window, 'scroll')
    //   .pipe(takeUntil(this._unsubscribe$))
    //   .pipe(switchMap(() => this._route.fragment))
    //   .pipe(takeUntil(this._unsubscribe$))
    //   .pipe(skipWhile(f => f === null))
    //   .subscribe(f => {
    //     const element: any = document.querySelector(f ? `#${f}` : 'body');
    //     const offsetTop = element.offsetTop;

    //     if (offsetTop !== window.scrollY) {
    //       const pathWithoutHash =  this._location.path(false);
    //       this._location.replaceState(pathWithoutHash)
    //     }
    //   });

  }

  public ngOnDestroy() {
    this._unsubscribe$.next();
    this._unsubscribe$.complete();
  }

}

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { skipWhile, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'ep-photography-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private _unsubscribe = new Subject();

  constructor(private _route: ActivatedRoute) {}

  public ngOnInit() {
  }

  public ngAfterViewInit() {
    this._route
      .fragment
      .pipe(takeUntil(this._unsubscribe))
      .pipe(skipWhile(val => val === null))
      .subscribe(val => {
        if (val) {
          const el = document.querySelector(`#${val}`);
          const pos = el.getBoundingClientRect().top;

          window.scrollTo({
            top: pos,
            behavior: 'smooth'
          });
        }
      });
  }

  public ngOnDestroy() {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }

}

import { Injectable } from '@angular/core';
import { of, Subject, Observable } from 'rxjs';

@Injectable()
export class UiService {
  public active = new Subject();
  public mobileNavActive = false;

  constructor() { }

  public getMobileNavStatus(): Observable<any> {
    return this.active.asObservable();
  }

  public toggleMobileNav(value = null) {
    if (!value) {
      value = this.mobileNavActive = !this.mobileNavActive;
    }

    this.active.next(value);
  }
}

import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'ep-photography-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public home = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(val => val instanceof NavigationEnd))
      .subscribe(val => {
        if (val['url'] === '/' || val['url'] === '/home') {
          this.home = true;
        } else {
          this.home = false;
        }
      });
  }

}

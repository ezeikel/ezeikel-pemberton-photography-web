import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'ep-photography-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public homepage = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(val => val instanceof NavigationEnd))
      .subscribe((val: { id, url, urlAfterRedirects }) => {
        const url = val.url.split('#');
        if (url[0] === '/' || url[0] === '/home') {
          this.homepage = true;
        } else {
          this.homepage = false;
        }
      });
  }

}

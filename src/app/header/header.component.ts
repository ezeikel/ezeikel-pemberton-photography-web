import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'ep-photography-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  menuActive = false;

  constructor() {}

  ngOnInit() {
  }

  toggleMenu(active: boolean) {
    this.menuActive = active;
  }

}

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hamburger-menu',
  templateUrl: './hamburger-menu.component.html',
  styleUrls: ['./hamburger-menu.component.css']
})
export class HamburgerMenuComponent implements OnInit {

  public isActive: boolean;

  constructor() {
    this.isActive = false;
  }

  ngOnInit() {
  }

  toggleIsActive () {
    this.isActive =  !this.isActive;
  }

}

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'ep-photography-hamburger',
  templateUrl: './hamburger.component.html',
  styleUrls: ['./hamburger.component.scss']
})
export class HamburgerComponent implements OnInit {
  public isActive = false;

  constructor() { }

  public toggleActive() {
    this.isActive = !this.isActive;
  }

  ngOnInit() {
  }

}

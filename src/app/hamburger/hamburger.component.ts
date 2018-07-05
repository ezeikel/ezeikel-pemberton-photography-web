import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ep-photography-hamburger',
  templateUrl: './hamburger.component.html',
  styleUrls: ['./hamburger.component.scss']
})
export class HamburgerComponent implements OnInit {
  public isActive = false;
  @Output() active = new EventEmitter<boolean>();

  constructor() { }

  public toggleActive() {
    this.isActive = !this.isActive;
    this.active.emit(this.isActive);
  }

  ngOnInit() {
  }

}

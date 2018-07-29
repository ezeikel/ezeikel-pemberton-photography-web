import { Component, OnInit } from '@angular/core';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'ep-photography-hamburger',
  templateUrl: './hamburger.component.html',
  styleUrls: ['./hamburger.component.scss']
})
export class HamburgerComponent implements OnInit {
  public isActive = false;

  constructor(private _uiService: UiService) { }

  ngOnInit() {
    this._uiService.getMobileNavStatus()
      .subscribe(val => {
        this.isActive = val;
      });
  }
  
  public toggleActive() {
    this._uiService.toggleMobileNav();
  }
}

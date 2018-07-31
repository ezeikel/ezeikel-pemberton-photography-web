import { Component, OnInit } from '@angular/core';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'ep-photography-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  public mobileNavActive;

  constructor(private _uiService: UiService) {}

  public ngOnInit() {
    this._uiService.getMobileNavStatus()
      .subscribe(val => {
        this.mobileNavActive = val;
      });
  }

  public handleClick() {
    if (this.mobileNavActive) {
      this._uiService.toggleMobileNav(false);
    }
  }

}

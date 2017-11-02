import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hero-header',
  templateUrl: './hero-header.component.html',
  styleUrls: ['./hero-header.component.scss']
})
export class HeroHeaderComponent implements OnInit {

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

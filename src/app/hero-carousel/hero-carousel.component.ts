import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'ep-photography-hero-carousel',
  templateUrl: './hero-carousel.component.html',
  styleUrls: ['./hero-carousel.component.scss']
})
export class HeroCarouselComponent implements OnInit {
  public $slides: Observable<any[]>

  constructor(private _firebaseService: FirebaseService) {}

  ngOnInit() {
    this.$slides = this._firebaseService.getCarouselImages(5)
  }

}

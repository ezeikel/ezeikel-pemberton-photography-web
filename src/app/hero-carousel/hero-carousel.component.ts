import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import 'firebase/storage';

// Import the Image interface
import { Image } from '../models/image.interface';

@Component({
  selector: 'ep-photography-hero-carousel',
  templateUrl: './hero-carousel.component.html',
  styleUrls: ['./hero-carousel.component.scss']
})
export class HeroCarouselComponent implements OnInit {
  public images = [];

  constructor(private _firebaseService: FirebaseService) {}

  async ngOnInit() {
    this.images = await this._firebaseService.getCarouselImages();
  }

}

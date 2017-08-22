import { Component, OnInit } from '@angular/core';

// Import the Image interface
import { Image } from '../image/image.interface';

@Component({
  selector: 'app-hero-carousel',
  templateUrl: './hero-carousel.component.html',
  styleUrls: ['./hero-carousel.component.css']
})
export class HeroCarouselComponent implements OnInit {

  public images: Image[];

  constructor() {
    this.images = [
      {'title': 'We are covered 1', 'url': './assets/images/slide-1.jpg'},
      {'title': 'We are covered 2', 'url': './assets/images/slide-2.jpg'},
      {'title': 'We are covered 3', 'url': './assets/images/slide-3.jpg'},
      {'title': 'We are covered 4', 'url': './assets/images/slide-4.jpg'},
      {'title': 'We are covered 5', 'url': './assets/images/slide-5.jpg'}
    ];
  }

  ngOnInit() {
  }

}

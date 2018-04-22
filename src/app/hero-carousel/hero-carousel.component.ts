import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
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
  public logo = {
    url: ''
  }

  constructor(private firebaseApp: FirebaseApp) {}

  ngOnInit() {
    const count = 5;
    const logo = this.firebaseApp.storage().ref().child(`logo/logo-white.png`);

    logo.getDownloadURL()
      .then(url => {
        this.logo.url = url;
      });

    for (let i = 1; i <= count; i++) {
      const storageRef = this.firebaseApp.storage().ref().child(`hero-carousel/slide-${i}.jpg`);
      storageRef.getDownloadURL().then(url => {
        this.images.push(url);
      });

    }
  }

}

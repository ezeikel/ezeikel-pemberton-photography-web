import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import * as firebase from 'firebase';

// Import the Image interface
import { Image } from '../image/image.interface';

@Component({
  selector: 'app-hero-carousel',
  templateUrl: './hero-carousel.component.html',
  styleUrls: ['./hero-carousel.component.css']
})
export class HeroCarouselComponent implements OnInit {

  public images = [];

  public logo = {
    url: ''
  }

  constructor(@Inject(FirebaseApp) firebaseApp: firebase.app.App) {

    const logo = firebaseApp.storage().ref().child(`logo/logo-white.png`);
    logo.getDownloadURL().then(url => {
      this.logo.url = url;
    });

    const count = 5;

    for (let i = 1; i <= count; i++) {
      const storageRef = firebaseApp.storage().ref().child(`hero-carousel/slide-${i}.jpg`);
      storageRef.getDownloadURL().then(url => {
        this.images.push(url);
      });

    }
  }

  ngOnInit() {
  }

}

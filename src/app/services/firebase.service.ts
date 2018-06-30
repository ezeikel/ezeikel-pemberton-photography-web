import { Injectable } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import { AngularFireDatabase } from 'angularfire2/database';

@Injectable()
export class FirebaseService {
  public latest = [
    {
      title: 'Fari + Tino',
      url: '',
      firebaseRef: 'fari-tino'
    },
    {
      title: 'Latrena + Pavel',
      url: '',
      firebaseRef: 'latrena-pavel'
    },
    {
      title: 'Vicky + Nii',
      url: '',
      firebaseRef: 'vicky-nii'
    }
  ];

  constructor(private _firebaseApp: FirebaseApp, private _db: AngularFireDatabase) {}

  public async getGalleryPreview(collection) {
    const storageRef = this._firebaseApp.storage().ref().child(`gallery-preview/${collection}.jpg`);
    return await storageRef.getDownloadURL();
  }

  public getBlogPreviews() {
    return this.latest.map(async item => {
      const storageRef = this._firebaseApp.storage().ref().child(`gallery-preview/${item.firebaseRef}.jpg`);
      item.url = await storageRef.getDownloadURL();
      return item;
    });
  }

  public async getCarouselImages() {
    const count = 5;
    const images = [];

    for (let i = 1; i <= count; i++) {
      const storageRef = this._firebaseApp.storage().ref().child(`hero-carousel/slide-${i}.jpg`);
      const url = await storageRef.getDownloadURL()
      images.push(url);
    }

    return images;
  }

  public getTestimonials() {
    return this._db.list('/testimonals').valueChanges();
  }

}

import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireStorage } from 'angularfire2/storage';
import { Observable } from 'rxjs';

@Injectable()
export class FirebaseService {
  public latest = [
    {
      title: 'Fari + Tino',
      url: null,
      firebaseRef: 'fari-tino'
    },
    {
      title: 'Latrena + Pavel',
      url: null,
      firebaseRef: 'latrena-pavel'
    },
    {
      title: 'Vicky + Nii',
      url: null,
      firebaseRef: 'vicky-nii'
    }
  ];

  constructor(private _db: AngularFireDatabase, private _storage: AngularFireStorage) {}

  public getGalleryPreview(collection): any {
    if (!collection) {
      return;
    }

    const ref = this._storage.ref(`gallery-preview/${collection}.jpg`);
    return ref.getDownloadURL();
  }

  public getBlogPreviews(): Array<object> {
    return this.latest.map(item => {
      const ref = this._storage.ref(`gallery-preview/${item.firebaseRef}.jpg`);
      item.url = ref.getDownloadURL();
      return item;
    });
  }

  public getCarouselImages(): Array<Observable<string>> {
    const count = 5;
    const images = [];

    for (let i = 1; i <= count; i++) {
      const ref = this._storage.ref(`hero-carousel/slide-${i}.jpg`);
      const url = ref.getDownloadURL()
      images.push(url);
    }

    return images;
  }

  public getTestimonials(): Observable<any[]> {
    return this._db.list('testimonals').valueChanges();
  }

}

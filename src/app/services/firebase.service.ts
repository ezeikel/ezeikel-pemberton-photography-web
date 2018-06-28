import { Injectable } from '@angular/core';
import { FirebaseApp } from 'angularfire2';

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

  constructor(private _firebaseApp: FirebaseApp) {}

  async getGalleryPreview(collection) {
    const storageRef = this._firebaseApp.storage().ref().child(`gallery-preview/${collection}.jpg`);
    return await storageRef.getDownloadURL();
  }

  getBlogPreviews() {
    return this.latest.map(async item => {
      const storageRef = this._firebaseApp.storage().ref().child(`gallery-preview/${item.firebaseRef}.jpg`);
      item.url = await storageRef.getDownloadURL();
      return item;
    })
  }
}

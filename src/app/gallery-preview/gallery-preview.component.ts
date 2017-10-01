import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import * as firebase from 'firebase';

@Component({
  selector: 'app-gallery-preview',
  templateUrl: './gallery-preview.component.html',
  styleUrls: ['./gallery-preview.component.css']
})
export class GalleryPreviewComponent implements OnInit {

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

  constructor(@Inject(FirebaseApp) firebaseApp: firebase.app.App) {

    for (let i = 0; i < this.latest.length; i++) {
      const storageRef = firebaseApp.storage().ref().child(`gallery-preview/${this.latest[i].firebaseRef}.jpg`);
      storageRef.getDownloadURL().then(url => {
        this.latest[i].url = url;
      });

    }
  }

  ngOnInit() {
  }

}

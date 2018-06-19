import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';

@Component({
  selector: 'ep-photography-blog-preview',
  templateUrl: './blog-preview.component.html',
  styleUrls: ['./blog-preview.component.scss']
})
export class BlogPreviewComponent implements OnInit {

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

  constructor(private  _firebaseApp: FirebaseApp) {

    for (let i = 0; i < this.latest.length; i++) {
      const storageRef = _firebaseApp.storage().ref().child(`gallery-preview/${this.latest[i].firebaseRef}.jpg`);
      storageRef.getDownloadURL().then(url => {
        this.latest[i].url = url;
      });

    }
  }

  ngOnInit() {
  }

}

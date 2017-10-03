import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import * as firebase from 'firebase';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.css']
})
export class CollectionComponent implements OnInit {
  collection: string;
  url: string;

  constructor(@Inject(FirebaseApp) firebaseApp: firebase.app.App, private route: ActivatedRoute) {
    this.route
      .params
      .subscribe(params => this.collection = params['collection']);

    const storageRef = firebaseApp.storage().ref().child(`gallery-preview/${this.collection}.jpg`);

    storageRef.getDownloadURL().then(url => {
      this.url = url;
      console.log(`URL: ${this.url}`);
    });
  }

  ngOnInit() {}
}

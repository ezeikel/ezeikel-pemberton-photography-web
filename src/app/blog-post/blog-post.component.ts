import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import * as firebase from 'firebase';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'ep-photography-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  collection: string;
  url: string;

  constructor(@Inject(FirebaseApp) firebaseApp: firebase.app.App, private route: ActivatedRoute) {
    this.route
      .params
      .subscribe(params => this.collection = params['post']);

    const storageRef = firebaseApp.storage().ref().child(`gallery-preview/${this.collection}.jpg`);

    storageRef.getDownloadURL().then(url => {
      this.url = url;
    });
  }

  ngOnInit() {}
}

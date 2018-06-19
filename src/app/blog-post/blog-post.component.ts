import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseApp } from 'angularfire2';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'ep-photography-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  public collection: string;
  public url: string;

  constructor(
    private _firebaseApp: FirebaseApp, 
    private _route: ActivatedRoute
  ) {
    this._route
      .params
      .subscribe(params => this.collection = params['post']);

    const storageRef = _firebaseApp.storage().ref().child(`gallery-preview/${this.collection}.jpg`);

    storageRef.getDownloadURL().then(url => {
      this.url = url;
    });
  }

  ngOnInit() {}
}

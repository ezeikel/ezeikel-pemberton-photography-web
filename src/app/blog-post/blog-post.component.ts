import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'ep-photography-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  public collection: string;
  public url: string;

  constructor(
    private _firebaseService: FirebaseService,
    private _route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this._route
      .params
      .subscribe(params => this.collection = params['post']);

    this.url = await this._firebaseService.getGalleryPreview(this.collection);
  }
}

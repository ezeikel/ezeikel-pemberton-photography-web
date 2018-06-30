import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'ep-photography-blog-preview',
  templateUrl: './blog-preview.component.html',
  styleUrls: ['./blog-preview.component.scss']
})
export class BlogPreviewComponent implements OnInit {
  public previews: Array<any>;

  constructor(private _firebaseService: FirebaseService) {}
  
  public ngOnInit() {
    this.previews = this._firebaseService.getBlogPreviews();
  }

}

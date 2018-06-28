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
  
  async ngOnInit() {
    this.previews = await Promise.all(this._firebaseService.getBlogPreviews());
  }

}

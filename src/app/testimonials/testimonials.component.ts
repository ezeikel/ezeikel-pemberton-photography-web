import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { Observable } from 'rxjs'

@Component({
  selector: 'ep-photography-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements OnInit {
  public testimonialsObservable: Observable<any[]>;
  public slideConfig = {
    'fade': true,
    'dots': false,
    'infinite': true,
    'slidesToShow': 1,
    'slidesToScroll': 1,
    'mobileFirst': true
  };

  constructor(private db: AngularFireDatabase) { }

  afterChange(e) {
    console.log('afterChange');
  }

  ngOnInit() {
    this.testimonialsObservable = this.getTestimonials('/testimonials');
  }

  getTestimonials(listPath): Observable<any[]> {
    return this.db.list(listPath).valueChanges();
  }

}

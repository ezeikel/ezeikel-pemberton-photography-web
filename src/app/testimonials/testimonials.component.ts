import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable'

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements OnInit {
  testimonialsObservable: Observable<any[]>;
  constructor(private db: AngularFireDatabase) { }

  ngOnInit() {
    this.testimonialsObservable = this.getTestimonials('/testimonials');
    console.log(this.testimonialsObservable);
  }

  getTestimonials(listPath): Observable<any[]> {
    return this.db.list(listPath).valueChanges();
  }

}

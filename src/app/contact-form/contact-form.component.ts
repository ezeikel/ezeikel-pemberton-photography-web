import { Component, OnInit } from '@angular/core';

import { TaveApiService } from '../tave-api.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
})
export class ContactFormComponent implements OnInit {
  data: {};

  constructor(private taveApiService: TaveApiService) {
    this.data = {
      FirstName: '',
      LastName: '',
      Email: '',
      MobilePhone: '',
      Message: '',
      JobType: ''
    }
  }

  onSubmit() {
    this.taveApiService.createLead(this.data);
  }

  ngOnInit() {
  }

}

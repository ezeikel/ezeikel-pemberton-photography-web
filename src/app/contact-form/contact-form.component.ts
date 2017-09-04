import { Component, OnInit } from '@angular/core';

import { TaveApiService } from '../tave-api.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
})
export class ContactFormComponent implements OnInit {

  constructor(private taveApiService: TaveApiService) { }

  createLead() {
    let test = this.taveApiService.testService();
    console.log(`This is from the service: ${test}`);
  }

  ngOnInit() {
    this.createLead();
  }

}

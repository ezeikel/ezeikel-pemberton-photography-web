import { Component, OnInit } from '@angular/core';
import { TaveApiService } from '../tave-api.service';
import { Lead } from '../lead/lead.model';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
})
export class ContactFormComponent implements OnInit {
  lead: Lead;
  firstName: string;
  event: string;
  submitted: boolean = false;

  constructor(private taveApiService: TaveApiService) {
    this.lead = new Lead('','','','',null,'','');
  }

  onSubmit() {
    this.taveApiService.createLead(this.lead);
    this.firstName = this.lead.FirstName;
    this.event = this.lead.JobType;
    this.submitted = true;
  }

  ngOnInit() {
  }

}

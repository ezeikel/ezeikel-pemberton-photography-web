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
  jobTypes = ['Proposal', 'Traditional Engagement', 'Wedding', 'Other'];

  constructor(private taveApiService: TaveApiService) {
    this.lead = new Lead('','','','','',null,'','');
  }

  upperCaseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  onSubmit() {
    // Remove email confirm from data sent to api
    if (this.lead.EmailConfirm.length > 0) {
      delete this.lead.EmailConfirm;
    }

    // Clean up format of data being sent
    this.lead.FirstName = this.upperCaseFirstLetter(this.lead.FirstName.trim().toLowerCase());
    this.lead.LastName = this.upperCaseFirstLetter(this.lead.LastName.trim().toLowerCase());
    this.lead.Email = this.lead.Email.trim().toLowerCase();
    this.lead.Message = this.upperCaseFirstLetter(this.lead.Message.trim().toLowerCase());

    // Send form data to tave api service
    this.taveApiService.createLead(this.lead);

    // To populate success message for user
    this.firstName = this.lead.FirstName;
    this.event = this.lead.JobType;

    this.submitted = true;
  }

  ngOnInit() {
  }

}

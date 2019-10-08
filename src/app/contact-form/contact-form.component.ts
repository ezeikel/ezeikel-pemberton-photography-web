import { Component, OnInit } from "@angular/core";
import { TaveApiService } from "../services/tave-api.service";
import { ILead } from "../models/lead.interface";

@Component({
  selector: `ep-photography-contact-form`,
  templateUrl: `./contact-form.component.html`,
  styleUrls: [`./contact-form.component.scss`],
})
export class ContactFormComponent implements OnInit {
  public lead: ILead;
  public JOBTYPES = [
    `Event`,
    `Pre Wedding Shoot`,
    `Proposal/Engagement`,
    `Traditional Engagement/Wedding`,
    `Wedding`,
  ];
  private _firstName: string;
  private _event: string;
  public submitted = false;

  constructor(private taveApiService: TaveApiService) {}

  ngOnInit() {
    this.lead = {
      SecretKey: ``,
      FirstName: ``,
      Email: ``,
      EmailConfirm: ``,
      JobType: ``,
      EventDate: ``,
    };
  }

  uppercaseFirstLetter = string =>
    string.charAt(0).toUpperCase() + string.slice(1)

  onSubmit() {
    // Remove email confirm from data sent to api
    if (this.lead.EmailConfirm.length > 0) {
      delete this.lead.EmailConfirm;
    }

    // Clean up format of data being sent
    this.lead.FirstName = this.uppercaseFirstLetter(
      this.lead.FirstName.trim().toLowerCase(),
    );
    this.lead.LastName = this.uppercaseFirstLetter(
      this.lead.LastName.trim().toLowerCase(),
    );
    this.lead.Email = this.lead.Email.trim().toLowerCase();
    this.lead.Message = this.uppercaseFirstLetter(
      this.lead.Message.trim().toLowerCase(),
    );

    // Send form data to tave api service
    this.taveApiService.createLead(this.lead);

    // To populate success message for user
    this._firstName = this.lead.FirstName;
    this._event = this.lead.JobType;

    return (this.submitted = true);
  }
}

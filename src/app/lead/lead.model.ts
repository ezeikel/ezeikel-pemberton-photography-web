export class Lead {

  constructor (public SecretKey: string, public FirstName: string, public LastName: string, public Email: string, public EmailConfirm: string, public MobilePhone: number, public Message: string, public JobType: string,) {
    this.SecretKey = SecretKey,
    this.FirstName = FirstName,
    this.LastName = LastName,
    this.Email = Email,
    this.EmailConfirm = EmailConfirm,
    this.MobilePhone = MobilePhone,
    this.Message = Message,
    this.JobType = JobType
  }

}

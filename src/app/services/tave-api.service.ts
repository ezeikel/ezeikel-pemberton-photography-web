import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs/operators';


@Injectable()
export class TaveApiService {
  private _studioId = '4b007MTo';
  private _secretKey = '831579260563ea036f63bd23a6c00c98d30c051e';
  private _apiUrl = 'https://tave.com/app/webservice/create-lead/';

  constructor(private http: HttpClient) {}

  createLead(data) {
    const url = this._apiUrl + this._studioId;

    data.SecretKey = this._secretKey;

    data = JSON.stringify(data);

    this.http
      .post(url, data)
      .pipe(retry(3))
      .subscribe(
        result => console.log('Lead created successfully.', result),
        err => console.error('There was an error creating lead: ', err)
      );
  }

}

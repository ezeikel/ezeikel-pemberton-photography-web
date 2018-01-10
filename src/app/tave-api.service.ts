import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/retry';


@Injectable()
export class TaveApiService {
  private _studioId: string;
  private _secretKey: string;
  private _apiUrl: string;

  constructor(private http: HttpClient) {
    this._studioId = `4b007MTo`;
    this._secretKey = `831579260563ea036f63bd23a6c00c98d30c051e`;
    this._apiUrl = `https://tave.com/app/webservice/create-lead/`;
  }

  createLead(data) {
    const url = this._apiUrl + this._studioId;

    data.SecretKey = this._secretKey;

    data = JSON.stringify(data);

    this.http
      .post(url, data)
      .retry(3)
      .subscribe(
        // Successful response cal the first callback
        data => console.info('Form posted successfully.'),
        // Errors will call this callback
        err => console.error('Something went wrong!')
      );
  }

}

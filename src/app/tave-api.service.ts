import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import 'rxjs/add/operator/map';


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
    let body;
    let url = this._apiUrl + this._studioId;

    let params = new HttpParams();

    params = params.append('SecretKey', this._secretKey);
    params = params.append('FirstName', data.FirstName);
    params = params.append('LastName', data.LastName);
    params = params.append('Email', data.Email);
    params = params.append('MobilePhone', data.MobilePhone);
    params = params.append('Message', data.Message);
    params = params.append('JobType', data.JobType);

    this.http
      .post(`${url}`, body, {
        params: params,
        // headers: new HttpHeaders().set('Content-Type', 'application/json'),
      })
      .subscribe(
        err => {
          console.log('Something went wrong!');
        }
      );
  }

}

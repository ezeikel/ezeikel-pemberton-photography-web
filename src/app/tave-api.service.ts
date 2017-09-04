import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class TaveApiService {
  private http: Http;
  private _studioId: string;
  private _secretKey: string;
  private _apiUrl: string;

  // constructor(studioId: string, secretKey: string) {
  //   this._studioId = studioId;
  //   this._secretKey = secretKey;
  // }

  constructor() {
    this._studioId = `4b007MTo`;
    this._secretKey = `831579260563ea036f63bd23a6c00c98d30c051e`;
    this._apiUrl = `https://tave.com/app/webservice/create-lead/`;
  }

  testService() {
    return `The service is working! :D`;
  }

  createLead() {
    const url = this._apiUrl + this._studioId;
    return this.http.post(`${url}`, 'blank for now');
  }

}

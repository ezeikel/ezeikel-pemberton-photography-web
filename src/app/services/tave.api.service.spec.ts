import { TestBed, inject } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { TaveApiService } from "./tave-api.service";

describe(`TaveApiService`, () => {
  let service;

  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [TaveApiService],
    }),
  );

  beforeEach(inject([TaveApiService], s => {
    service = s;
  }));
});

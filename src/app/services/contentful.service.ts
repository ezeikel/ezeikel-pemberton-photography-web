import { Injectable } from "@angular/core";
import { createClient } from "contentful";
import { environment } from "../../environments/environment";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ContentfulService {
  private client = createClient({
    space: environment.contentful.spaceId,
    accessToken: environment.contentful.token
  });

  constructor() {}

  public getCarouselImages(query?: object): Observable<string[]> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: "heroCarousel"
          },
          query
        )
      )
    ).pipe(
      map(res =>
        res.items[0].fields["images"].map(
          image => image.fields.photo.fields.file.url
        )
      )
    );
  }
}

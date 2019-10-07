import { Injectable } from "@angular/core";
import { createClient, Entry } from "contentful";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

@Injectable()
export class ContentfulService {
  private client = createClient({
    space: environment.contentful.spaceId,
    accessToken: environment.contentful.token
  });

  constructor() {}

  public getCarouselImages(query?: object): Promise<Entry<any>[]> {
    return this.client
      .getEntries(
        Object.assign(
          {
            content_type: "heroCarouselImage"
          },
          query
        )
      )
      .then(res => res.items);

    // TODO:
    // return response.items.map(item => item.fields.photo.field.file.url);
  }

  // public getCarouselImages(count: number): Observable<string[]> {
  //   const imageUrls = [];

  //   for (let i = 1; i <= count; i++) {
  //     const ref = this._getStorageUrl('hero-carousel', `slide-${i}`);
  //     const url = ref.getDownloadURL();
  //     imageUrls.push(url);
  //   }

  //   return forkJoin(...imageUrls).pipe(skipWhile(urls => urls.length === 0));
  // }
}

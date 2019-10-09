import { Injectable } from "@angular/core";
import { createClient } from "contentful";
import { environment } from "../../environments/environment";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ContentfulService {
  private client = createClient({
    space: environment.contentful.spaceId,
    accessToken: environment.contentful.token,
  });

  constructor() {}

  public getCarouselImages(query?: object): Observable<string[]> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: `heroCarousel`,
          },
          query,
        ),
      ),
    ).pipe(
      map(res =>
        res.items[0].fields[`images`].map(
          image => image.fields.photo.fields.file.url,
        ),
      ),
    );
  }

  public getDetails(query?: object): Observable<string[]> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: `textImages`,
          },
          query,
        ),
      ),
    ).pipe(
      map(res =>
        res.items[0].fields[`textImage`].map((detail, index) => ({
          copy: detail.fields.copy,
          imageUrl: detail.fields.image.fields.file.url,
          cta: index === 1 ? true : false,
        })),
      ),
    );
  }

  public getBlogPreviews(
    query?: object,
  ): Observable<{ title: string; previews: any[] }> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: `preview`,
          },
          query,
        ),
      ),
    ).pipe(
      map(res => {
        const title = res.items[0].fields[`title`];
        const previews = res.items[0].fields[`previewImage`].map(preview => ({
          title: preview.fields.caption,
          url: preview.fields.photo.fields.file.url,
          slug: preview.fields.slug,
        }));
        return { title, previews };
      }),
    );
  }
}

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

  public getBlogPreviews(query?: object): Observable<{ previews: any[] }> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: `post`,
            include: 2,
          },
          query,
        ),
      ),
    ).pipe(
      map(res => {
        const previews = res.items.map((preview: any) => ({
          title: preview.fields.title,
          url:
            preview.fields.photos.fields.coverImage[0].fields.photo.fields.file
              .url,
          slug: preview.fields.slug,
          type: preview.fields.type,
        }));
        return { previews };
      }),
    );
  }

  public getBlogPost(query?: object): Observable<any> {
    // convert Promise to an Observable
    return from(
      this.client.getEntries(
        Object.assign(
          {
            content_type: `post`,
            include: 2,
          },
          query,
        ),
      ),
    ).pipe(
      map((res: any) => {
        // TODO: Create Blog post interface
        const { slug, story, tags, title, type } = res.items[0].fields;
        let {
          photos: {
            fields: { images },
          },
        } = res.items[0].fields;

        images = images.map(image => image.fields.photo.fields.file.url);

        return {
          title,
          story,
          images,
          type,
          slug,
          tags,
        };
      }),
    );
  }
}

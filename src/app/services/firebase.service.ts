import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireStorage } from 'angularfire2/storage';
import { Observable, forkJoin, from } from 'rxjs';
import { skipWhile } from 'rxjs/operators';

@Injectable()
export class FirebaseService {
  constructor(private _db: AngularFireDatabase, private _storage: AngularFireStorage) {}

  public getGalleryPreview(collection: string): any {
    if (!collection) {
      return;
    }

    const ref = this._getStorageUrl('gallery-preview', collection);
    return ref.getDownloadURL();
  }

  public getBlogPreviews(latest): Observable<any> {
    const urls = [];

    latest.forEach(item => {
      const ref = this._getStorageUrl('gallery-preview', item.firebaseRef);
      urls.push(ref.getDownloadURL());

      return item;
    });

    return forkJoin(...urls);
  }

  public getCarouselImages(count: number): Observable<string[]> {
    const imageUrls = [];

    for (let i = 1; i <= count; i++) {
      const ref = this._getStorageUrl('hero-carousel', `slide-${i}`);
      const url = ref.getDownloadURL()
      imageUrls.push(url);
    }

    return forkJoin(...imageUrls).pipe(skipWhile(urls => urls.length === 0));
  }

  public getTestimonials(): Observable<any[]> {
    return this._db.list('testimonals').valueChanges();
  }

  private _getStorageUrl(node, firebaseRef) {
    return this._storage.ref(`${node}/${firebaseRef}.jpg`);
  }

}

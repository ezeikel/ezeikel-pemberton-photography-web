import { TestBed, inject } from '@angular/core/testing';

import { FirebaseService } from './firebase.service';
import { FirebaseApp } from 'angularfire2';
import { AngularFireDatabase } from 'angularfire2/database';

describe('FirebaseService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ 
        FirebaseApp, 
        FirebaseService,
        AngularFireDatabase
      ]
    });
  });

  it('should be created', inject([FirebaseService], (service: FirebaseService) => {
    expect(service).toBeTruthy();
  }));
});

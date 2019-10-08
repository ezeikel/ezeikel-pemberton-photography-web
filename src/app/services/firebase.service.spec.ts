import { TestBed, inject } from "@angular/core/testing";
import { environment } from "../../environments/environment";
import { FirebaseService } from "./firebase.service";
import { AngularFireModule } from "angularfire2";
import { AngularFireDatabase } from "angularfire2/database";
import { AngularFireStorage } from "angularfire2/storage";

describe(`FirebaseService`, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AngularFireModule.initializeApp(environment.firebase)],
      providers: [FirebaseService, AngularFireDatabase, AngularFireStorage],
    });
  });

  it(`should be created`, inject(
    [FirebaseService],
    (service: FirebaseService) => {
      expect(service).toBeTruthy();
    },
  ));
});

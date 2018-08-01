import { Component, OnInit } from "@angular/core";
import { FirebaseService } from "../services/firebase.service";

@Component({
  selector: "ep-photography-latest-updates",
  templateUrl: "./latest-updates.component.html",
  styleUrls: ["./latest-updates.component.scss"]
})
export class LatestUpdatesComponent implements OnInit {
  public previews: Array<any>;
  public latest = [
    {
      title: "Fari + Tino",
      url: "",
      firebaseRef: "fari-tino"
    },
    {
      title: "Latrena + Pavel",
      url: "",
      firebaseRef: "latrena-pavel"
    },
    {
      title: "Vicky + Nii",
      url: "",
      firebaseRef: "vicky-nii"
    }
  ];

  constructor(private _firebaseService: FirebaseService) {}

  public ngOnInit() {
    // TODO: replace this with call to db to check latest weddings
    this._firebaseService.getBlogPreviews(this.latest).subscribe(urls => {
      this.previews = this.latest.map((item, i) => {
        item.url = urls[i];
        return item;
      });
    });
  }
}

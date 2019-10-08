import { Component, OnInit } from "@angular/core";

@Component({
  selector: `ep-photography-footer`,
  templateUrl: `./footer.component.html`,
  styleUrls: [`./footer.component.scss`],
})
export class FooterComponent implements OnInit {
  public year: number;

  constructor() {}

  ngOnInit() {
    this.year = new Date().getFullYear();
  }
}

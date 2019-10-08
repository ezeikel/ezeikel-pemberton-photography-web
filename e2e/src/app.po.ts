import { browser, element, by } from "protractor";

export class EzeikelPembertonPhotographyWebPage {
  navigateTo() {
    return browser.get(`/`);
  }

  getParagraphText() {
    return element(by.css(`ep-photography-root h1`)).getText();
  }
}

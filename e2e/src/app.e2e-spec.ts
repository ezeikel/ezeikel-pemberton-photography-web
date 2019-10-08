import { EzeikelPembertonPhotographyWebPage } from "./app.po";

describe(`ezeikel-pemberton-photography-web App`, () => {
  let page: EzeikelPembertonPhotographyWebPage;

  beforeEach(() => {
    page = new EzeikelPembertonPhotographyWebPage();
  });

  it(`should display message saying app works`, () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual(`app works!`);
  });
});

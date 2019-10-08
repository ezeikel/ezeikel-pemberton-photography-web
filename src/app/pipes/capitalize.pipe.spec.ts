import { CapitalizePipe } from "./capitalize.pipe";

describe(`Capitalize`, () => {
  let pipe: CapitalizePipe;

  beforeEach(() => {
    pipe = new CapitalizePipe();
  });

  it(`should capitalize the first letter of any string`, () => {
    expect(pipe.transform(`ezeikel`)).toBe(`Ezeikel`);
  });
});

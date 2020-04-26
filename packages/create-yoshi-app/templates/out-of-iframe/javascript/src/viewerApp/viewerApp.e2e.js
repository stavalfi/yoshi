const { viewerUrl } = require('../../dev/sites');

describe('Viewer App', () => {
  it('should display the title text', async () => {
    await page.goto(viewerUrl);
    await page.waitForSelector('h2', {
      timeout: 15000 * 2,
    });

    expect(await page.$eval('h2', e => e.textContent)).toEqual('Hello World!');
  });
});

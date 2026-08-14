describe('Example E2E Testing', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have Pharmacy tab visible', async () => {
    await expect(element(by.text('صيدلية'))).toBeVisible();
  });

  it('should be able to navigate to Consultations and back to Home', async () => {
    await element(by.text('استشارات')).tap();
    await expect(element(by.text('عروض وباقات'))).toBeVisible();
    
    await element(by.text('الرئيسية')).tap();
    await expect(element(by.text('مرحباً زائر'))).toBeVisible();
  });
});

import { savePin } from '../../src/app/pin';
import { openRepo } from '../../src/storage/index';

// Gives the family on this test device a grown-ups PIN (1234), so the app opens past "Choose a PIN".
export async function giveFamilyPin(): Promise<void> {
  await savePin((await openRepo()).repo, '1234');
}

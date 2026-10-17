/**
 * 16.5 against a REAL ClamAV daemon. Skipped unless CLAMD_INTEGRATION=1 (CI job `clamav-integration` in security.yml starts
 * clamav/clamav and sets CLAMD_HOST): the unit tests use a protocol stand-in, this proves the signature database refuses the
 * EICAR test file through the same code path production uses.
 */
import { ClamavService } from './clamav.service';
import { UploadSecurityService } from './upload-security.service';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const run = process.env.CLAMD_INTEGRATION === '1' ? describe : describe.skip;

run('ClamAV daemon (integration)', () => {
  const clamav = new ClamavService();

  it('answers clean for an ordinary PDF and infected for the EICAR test file', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
    expect(await clamav.scan(pdf)).toEqual({ status: 'clean' });
    const verdict = await clamav.scan(Buffer.concat([pdf.subarray(0, pdf.length - 6), Buffer.from(EICAR), Buffer.from('\n%%EOF\n')]));
    expect(verdict.status).toBe('infected');
    expect((verdict as { signature: string }).signature).toMatch(/eicar/i);
  });

  it('an upload carrying the EICAR file is refused with file_infected, in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const svc = new UploadSecurityService(clamav);
    const infected = Buffer.from(`%PDF-1.4\n${EICAR}\n%%EOF\n`);
    await expect(svc.inspect({ purpose: 'lab_report', declared_mime: 'application/pdf', data_base64: infected.toString('base64') }))
      .rejects.toMatchObject({ response: { code: 'file_infected' } });
  });

  it('a large clean file streams through (several INSTREAM chunks)', async () => {
    expect(await clamav.scan(Buffer.alloc(3 * 1024 * 1024, 65))).toEqual({ status: 'clean' });
  });
});

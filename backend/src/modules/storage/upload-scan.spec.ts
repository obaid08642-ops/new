/** 16.5: the antivirus decides an upload: infected is refused everywhere; no scanner is refused in production. */
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { UploadSecurityService, sniffMediaType } from './upload-security.service';
import { ClamavService, ScanVerdict } from './clamav.service';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const b64 = (b: Buffer) => b.toString('base64');
const scanner = (verdict: ScanVerdict) => ({ scan: jest.fn(async () => verdict) }) as unknown as ClamavService;

describe('the antivirus decides an upload (16.5)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('an infected file is refused with file_infected, in development and in production', async () => {
    for (const nodeEnv of ['development', 'production']) {
      process.env.NODE_ENV = nodeEnv;
      const svc = new UploadSecurityService(scanner({ status: 'infected', signature: 'Eicar-Test-Signature' }));
      await expect(svc.inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF) }))
        .rejects.toMatchObject({ response: { code: 'file_infected' } });
    }
  });

  it('a clean file passes; the scan sees the bytes as they were sent', async () => {
    const clamav = scanner({ status: 'clean' });
    const out = await new UploadSecurityService(clamav).inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF) });
    expect(out.detected_mime).toBe('application/pdf');
    expect((clamav.scan as jest.Mock).mock.calls[0][0].equals(PDF)).toBe(true);
  });

  it('with no usable scanner: production refuses (503), a developer machine lets it through', async () => {
    const down = scanner({ status: 'unavailable', reason: 'clamd_unreachable' });
    process.env.NODE_ENV = 'production';
    delete process.env.UPLOAD_SCAN;
    await expect(new UploadSecurityService(down).inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF) })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(new UploadSecurityService().inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF) })).rejects.toThrow('virus_scanner_unavailable');
    process.env.NODE_ENV = 'development';
    await expect(new UploadSecurityService(down).inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF) })).resolves.toBeDefined();
  });

  it('UPLOAD_SCAN=required refuses without a scanner outside production too; =optional allows it in production', async () => {
    const down = scanner({ status: 'unavailable', reason: 'clamd_unreachable' });
    process.env.NODE_ENV = 'development';
    process.env.UPLOAD_SCAN = 'required';
    await expect(new UploadSecurityService(down).assertClean(PDF)).rejects.toThrow('virus_scanner_unavailable');
    process.env.NODE_ENV = 'production';
    process.env.UPLOAD_SCAN = 'optional';
    await expect(new UploadSecurityService(down).assertClean(PDF)).resolves.toBe('skipped'); // allowed, but not scanned
  });

  it('a PDF with JavaScript, a launch action or an embedded file is refused', async () => {
    const svc = new UploadSecurityService(scanner({ status: 'clean' }));
    for (const evil of ['/JavaScript (app.alert(1))', '/S /Launch /F (cmd.exe)', '/Type /EmbeddedFile', '/OpenAction << /S /JavaScript /JS (x) >>', '/RichMedia']) {
      const pdf = Buffer.from(`%PDF-1.4\n1 0 obj\n<< ${evil} >>\nendobj\n%%EOF\n`);
      await expect(svc.inspect({ purpose: 'lab_report', declared_mime: 'application/pdf', data_base64: b64(pdf) })).rejects.toMatchObject({ response: { code: 'pdf_active_content_refused' } });
    }
    await expect(svc.inspect({ purpose: 'lab_report', declared_mime: 'application/pdf', data_base64: b64(PDF) })).resolves.toBeDefined();
  });
});

describe('media uploads (POST /media/upload) are judged by their bytes (16.5)', () => {
  const svc = new UploadSecurityService(scanner({ status: 'clean' }));
  const ole = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]);
  const zip = (firstEntry: string, extra = '') => {
    const name = Buffer.from(firstEntry, 'latin1');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(name.length, 26);
    return Buffer.concat([header, name, Buffer.from(extra, 'latin1'), Buffer.alloc(32)]);
  };
  const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(16)]);
  const m4a = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypM4A '), Buffer.alloc(16)]);
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(32)]);

  it('accepts a voice note (m4a, wav, mp3), a Word / Excel file (old and new) in a chat, whatever mime name the phone gave', async () => {
    for (const [bytes, mime, ext] of [[m4a, 'audio/x-m4a', 'm4a'], [wav, 'audio/wav', 'wav'], [mp3, 'audio/mpeg', 'mp3'], [ole, 'application/msword', 'doc'], [zip('[Content_Types].xml'), 'application/octet-stream', 'docx']] as const) {
      const out = await svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: mime, bytes: bytes as Buffer });
      expect(out.ext).toBe(ext);
      expect(out.bytes.length).toBeGreaterThan(0);
    }
  });

  it('refuses an executable renamed to .png, a JAR, and a macro-enabled Office file', async () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);
    await expect(svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'image/png', bytes: exe })).rejects.toThrow('executable_upload_refused');
    await expect(svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'application/zip', bytes: zip('META-INF/MANIFEST.MF') })).rejects.toThrow('executable_upload_refused');
    await expect(svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'application/vnd.ms-word', bytes: zip('[Content_Types].xml', 'word/vbaProject.bin') })).rejects.toThrow('macro_document_refused');
    await expect(svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'text/plain', bytes: Buffer.from('just text') })).rejects.toThrow('file_type_could_not_be_detected');
  });

  it('a prescription or an avatar takes pictures (and PDFs for a prescription) only; a picture declared as a PDF is a mismatch', async () => {
    await expect(svc.inspectMedia({ purpose: 'prescription', declared_mime: 'audio/wav', bytes: wav })).rejects.toThrow('file_type_does_not_match_declared_mime');
    await expect(svc.inspectMedia({ purpose: 'avatar', declared_mime: 'application/pdf', bytes: PDF })).rejects.toThrow('file_type_does_not_match_declared_mime');
    await expect(svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'image/png', bytes: PDF })).rejects.toThrow('file_type_does_not_match_declared_mime');
  });

  it('chooses the extension itself (the caller\'s .exe name does not reach the key) and refuses an infected file', async () => {
    const out = await svc.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'audio/wav', bytes: wav });
    expect(out.ext).toBe('wav');
    const infected = new UploadSecurityService(scanner({ status: 'infected', signature: 'Win.Test.EICAR_HDB-1' }));
    await expect(infected.inspectMedia({ purpose: 'chat_attachment', declared_mime: 'audio/wav', bytes: wav })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sniffMediaType does not take a bare ZIP for a document', () => {
    expect(sniffMediaType(zip('word/document.xml'))).toBeNull();
    expect(sniffMediaType(zip('[Content_Types].xml'))?.kind).toBe('office');
  });
});

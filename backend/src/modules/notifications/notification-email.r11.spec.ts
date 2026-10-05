// R11 §5 lead 17 (semgrep): sendEmail put the notification title and body into
// the HTML unescaped. Titles and bodies carry user-controlled text (names,
// chat previews, admin broadcasts), so markup in them became live HTML.
import { NotificationsService } from './notifications.service';

describe('notification email HTML is escaped (R11 §5 lead 17)', () => {
  it('title and body are text, not markup', async () => {
    const sent: { html: string; text: string }[] = [];
    const mail = { send: jest.fn(async (_to: string, _subject: string, html: string, text: string) => { sent.push({ html, text }); return { ok: true }; }) };
    const svc = new NotificationsService({} as never, {} as never, {} as never, {} as never, mail as never, {} as never, {} as never);
    await svc.sendEmail({ title: 'Hi <img src=x onerror=alert(1)>', body: '<a href="https://evil.example">claim</a> & more' }, 'p@example.test');
    expect(sent[0].html).not.toContain('<img');
    expect(sent[0].html).not.toContain('<a ');
    expect(sent[0].html).toContain('Hi &lt;img src=x onerror=alert(1)&gt;');
    expect(sent[0].html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;claim&lt;/a&gt; &amp; more');
    expect(sent[0].text).toBe('<a href="https://evil.example">claim</a> & more');
  });
});

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(input: string): string {
  const str = input.replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const idx = b64chars.indexOf(char);
    if (idx === -1) continue;

    buffer = (buffer << 6) | idx;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      const byte = (buffer >> bits) & 0xff;
      output += String.fromCharCode(byte);
    }
  }

  return output;
}

export function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = decodeBase64(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(
      decodeURIComponent(
        decoded
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  } catch {
    return null;
  }
}

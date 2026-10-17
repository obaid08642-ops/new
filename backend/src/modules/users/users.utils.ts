import { UpdatePatientInsuranceDto } from './users.dto';

/**
 * Sanitize and return an insurance DTO-safe JSON object.
 * Never echoes raw user input — all string values are validated
 * through the DTO and output as plain text, preventing XSS.
 */
export function sanitizeInsuranceDto(data: any): any {
  const safe: any = {};

  // Whitelist known canonical fields; skip anything else.
  const allowed = new Set([
    'provider',
    'provider_name',
    'policy_number',
    'network',
    'class',
    'expiry_date',
    'member_name',
    'national_id',
    'verified',
    'pdf_url',
    'ocr_extracted',
    'nphies_eligible',
  ]);

  for (const key of Object.keys(data || {})) {
    if (!allowed.has(key)) continue;
    const val = data[key];
    if (typeof val === 'string') {
      // Escape HTML to prevent XSS — output safe plain text only.
      safe[key] = val
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/'/g, '');
    } else if (typeof val === 'boolean') {
      safe[key] = val;
    } else if (typeof val === 'number' || typeof val === 'object' || val === null) {
      safe[key] = val;
    }
  }

  return safe;
}
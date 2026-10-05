/**
 * Small marks the boards draw outside the FIcon set, ported unchanged (not redrawn):
 *
 *   SEAL / SEAL_CHECK   the verified badge beside a doctor's name (canvas/Consult.dc.html),
 *                       viewBox 0 0 24 24, the seal filled, the check stroked 2 with round caps;
 *   CLOCK               the next-slot clock in the DoctorCard footer (canvas/Consult.dc.html),
 *                       viewBox 0 0 24 24, stroked 2;
 *   PLUS_SQUARE         the add-to-cart glyph of the product card (canvas/PharmacyHub.dc.html),
 *                       Phosphor fill, viewBox 0 0 256 256.
 */
export const MARK_VIEWBOX_24 = '0 0 24 24';

export const SEAL_PATH =
  'M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z';
export const SEAL_CHECK_PATH = 'M8.5 12.2l2.3 2.3 4.7-4.7';
export const CLOCK_PATH = 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M12 7v5l3 2';
export const PLUS_SQUARE_PATH =
  'M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,136H136v48a8,8,0,0,1-16,0V136H72a8,8,0,0,1,0-16h48V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z';

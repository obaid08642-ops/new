import { Injectable } from '@nestjs/common';

export interface PermissionRule {
  action: string;
  guestAllowed: boolean;
  accountRequired: boolean;
  description: string;
}

@Injectable()
export class PermissionMatrixService {
  private readonly rules: PermissionRule[] = [
    { action: 'browse', guestAllowed: true, accountRequired: false, description: 'Browse catalog and content' },
    { action: 'search', guestAllowed: true, accountRequired: false, description: 'Search medicines and services' },
    { action: 'cart_add', guestAllowed: true, accountRequired: false, description: 'Add items to cart' },
    { action: 'cart_remove', guestAllowed: true, accountRequired: false, description: 'Remove items from cart' },
    { action: 'pharmacy_order', guestAllowed: true, accountRequired: false, description: 'Order from pharmacy (card/cash)' },
    { action: 'book_consultation', guestAllowed: true, accountRequired: false, description: 'Book consultation (card/cash)' },
    { action: 'book_lab', guestAllowed: true, accountRequired: false, description: 'Book lab test (card/cash)' },
    { action: 'book_radiology', guestAllowed: true, accountRequired: false, description: 'Book radiology (card/cash)' },
    { action: 'book_nursing', guestAllowed: true, accountRequired: false, description: 'Book nursing (card/cash)' },
    { action: 'insurance', guestAllowed: false, accountRequired: true, description: 'Use insurance for orders' },
    { action: 'family', guestAllowed: false, accountRequired: true, description: 'Family accounts and members' },
    { action: 'medical_records', guestAllowed: false, accountRequired: true, description: 'View medical records and reports' },
    { action: 'prescription_refills', guestAllowed: false, accountRequired: true, description: 'Prescription refills' },
    { action: 'loyalty_points', guestAllowed: false, accountRequired: true, description: 'Loyalty points and rewards' },
    { action: 'saved_cards', guestAllowed: false, accountRequired: true, description: 'Saved payment cards' },
    { action: 'chat_history', guestAllowed: false, accountRequired: true, description: 'Chat history after order closed' },
  ];

  isAllowed(action: string, isGuest: boolean): boolean {
    const rule = this.rules.find(r => r.action === action);
    if (!rule) return false;
    if (isGuest) return rule.guestAllowed;
    return true;
  }

  getGuestPermissions(): string[] {
    return this.rules.filter(r => r.guestAllowed).map(r => r.action);
  }

  getAccountRequiredPermissions(): string[] {
    return this.rules.filter(r => r.accountRequired).map(r => r.action);
  }

  getAllRules(): PermissionRule[] {
    return this.rules;
  }
}

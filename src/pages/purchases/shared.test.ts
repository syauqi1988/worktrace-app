import { describe, expect, it } from 'vitest';
import { purchaseProductFields, calcTotals } from './shared';

describe('purchase catalog items', () => {
  it('fills the same product name, description, unit and price as sales', () => {
    expect(purchaseProductFields({ description: 'Cable', description_detail: 'Copper', uom: 'Meter', unit_price: 12.5 }))
      .toEqual({ item: 'Cable', description_detail: 'Copper', uom: 'Meter', price: 12.5 });
  });
  it('preserves purchase quantity, account, discount and tax when selecting a product', () => {
    const line = { id: 'one', item: '', account: 'Materials', qty: 3, price: 0, discount: 2, tax: 6 };
    const filled = { ...line, ...purchaseProductFields({ description: 'Cable', description_detail: '', uom: 'Meter', unit_price: 10 }) };
    expect(filled).toMatchObject({ qty: 3, account: 'Materials', discount: 2, tax: 6 });
    expect(calcTotals({ lines: [filled], taxMode: 'exclusive', rounding: false }).total).toBe(29.68);
  });
});
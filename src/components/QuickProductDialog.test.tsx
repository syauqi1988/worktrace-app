import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickProductDialog from './QuickProductDialog';

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/i18n/dual', () => ({ useL: () => (en: string) => en }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('purchase product creation', () => {
  beforeEach(() => insert.mockReset());
  const fill = () => {
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: 'Copper cable' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '12.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Document' }));
  };
  it('saves new purchase products to the catalog before adding them to the document', async () => {
    insert.mockResolvedValue({ error: null });
    const onCreated = vi.fn();
    render(<QuickProductDialog open onOpenChange={vi.fn()} onCreated={onCreated} alwaysSaveToCatalog />);
    fill();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ description: 'Copper cable', description_detail: '', unit_price: 12.5, uom: 'Unit' }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', name: 'Copper cable', unit_price: 12.5, is_active: true }));
  });
  it('does not add a product to the document if catalog saving fails', async () => {
    insert.mockResolvedValue({ error: { message: 'Save failed' } });
    const onCreated = vi.fn();
    render(<QuickProductDialog open onOpenChange={vi.fn()} onCreated={onCreated} alwaysSaveToCatalog />);
    fill();
    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(onCreated).not.toHaveBeenCalled();
  });
});
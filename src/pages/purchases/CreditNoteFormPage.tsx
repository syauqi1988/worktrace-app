import PurchaseFormPage from './PurchaseFormPage';

export default function CreditNoteFormPage() {
  return (
    <PurchaseFormPage
      title="New Credit Note"
      numberPlaceholder="CN-[5DIGIT]"
      referenceLabel="Bill Reference"
      statuses={['Draft', 'Approved', 'Closed']}
    />
  );
}

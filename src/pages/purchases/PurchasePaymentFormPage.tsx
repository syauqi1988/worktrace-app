import PurchaseFormPage from './PurchaseFormPage';

export default function PurchasePaymentFormPage() {
  return (
    <PurchaseFormPage
      title="New Payment"
      numberPlaceholder="PAY-[5DIGIT]"
      referenceLabel="Bill Reference"
      statuses={['Draft', 'Pending', 'Paid']}
    />
  );
}

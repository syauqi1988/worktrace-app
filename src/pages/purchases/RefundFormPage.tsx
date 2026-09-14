import PurchaseFormPage from './PurchaseFormPage';

export default function RefundFormPage() {
  return (
    <PurchaseFormPage
      title="New Refund"
      numberPlaceholder="RF-[5DIGIT]"
      statuses={['Draft', 'Pending', 'Approved', 'Closed']}
    />
  );
}

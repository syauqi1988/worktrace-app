import PurchaseFormPage from './PurchaseFormPage';

export default function BillFormPage() {
  return (
    <PurchaseFormPage
      title="New Bill"
      numberPlaceholder="BILL-[5DIGIT]"
      statuses={['Draft', 'Unpaid', 'Paid']}
    />
  );
}

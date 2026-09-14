import PurchaseFormPage from './PurchaseFormPage';

export default function PurchaseOrderFormPage() {
  return (
    <PurchaseFormPage
      title="New Purchase Order"
      numberPlaceholder="PO-[5DIGIT]"
      statuses={['Draft', 'Pending Approval', 'Ready']}
    />
  );
}

import PurchaseFormPage from './PurchaseFormPage';

export default function GoodsReceivedNoteFormPage() {
  return (
    <PurchaseFormPage
      title="New Goods Received Note"
      numberPlaceholder="GRN-[5DIGIT]"
      referenceLabel="PO Reference"
      statuses={['Draft', 'Received', 'Closed']}
    />
  );
}

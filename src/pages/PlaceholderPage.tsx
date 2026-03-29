export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm mt-1">Akan datang dalam fasa seterusnya.</p>
    </div>
  );
}

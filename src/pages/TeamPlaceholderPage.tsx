import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tx } from '@/lib/tx';

export default function TeamPlaceholderPage() {
  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Pengurusan Pasukan</h2>
        <p className="text-sm text-muted-foreground">
          Ciri multi-pengguna untuk pelan Agency akan datang tidak lama lagi. Anda akan dapat menjemput ahli pasukan,
          menetapkan peranan, dan mengurus akses.
        </p>
        <span className="inline-block text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
          {tx('Akan Datang')}
        </span>
        <div>
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={() =>
              window.open(
                "https://wa.me/60129600016?text=Saya+berminat+dengan+ciri+multi-pengguna+WorkTrace+Agency",
                "_blank",
              )
            }
          >
            Maklumkan Saya
          </Button>
        </div>
      </div>
    </div>
  );
}

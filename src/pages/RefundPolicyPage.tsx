import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2 font-display">Dasar Bayaran Balik</h1>
        <p className="text-sm text-muted-foreground mb-8">WorkTrace — terkini Mei 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Jaminan Bayaran Balik 14 Hari</h2>
            <p>WorkTrace menawarkan jaminan bayaran balik penuh dalam tempoh 14 hari dari tarikh pembayaran pertama anda untuk langganan berbayar (Pro atau Team). Ini adalah jaminan tanpa soal-jawab untuk pelanggan baru.</p>
            <h3 className="font-semibold mt-3">1.1 Syarat Kelayakan</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Bayaran balik 14 hari hanya terpakai untuk pembayaran pertama setiap akaun;</li>
              <li>Permohonan mesti dihantar dalam tempoh 14 hari kalendar dari tarikh pembayaran;</li>
              <li>Terpakai untuk pelan Pro (bulanan atau tahunan) dan pelan Team;</li>
              <li>Tidak terpakai untuk pelan percuma.</li>
            </ul>
            <h3 className="font-semibold mt-3">1.2 Cara Memohon</h3>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>Hantar emel ke <a className="underline" href="mailto:customerservice@worktrace.my">customerservice@worktrace.my</a> dengan subjek "Permohonan Bayaran Balik — [Nama Akaun]";</li>
              <li>Sertakan nombor akaun, tarikh pembayaran, dan jumlah yang dibayar;</li>
              <li>Pasukan kami akan memproses permohonan dalam masa 3–5 hari bekerja;</li>
              <li>Bayaran balik akan dikreditkan ke kaedah pembayaran asal anda.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Pembatalan Langganan</h2>
            <h3 className="font-semibold">2.1 Langganan Bulanan</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Boleh dibatalkan bila-bila masa melalui Tetapan → Langganan;</li>
              <li>Tiada bayaran balik pro-rated untuk bulan semasa selepas tempoh 14 hari;</li>
              <li>Akses Pro berterusan sehingga tamat tempoh bil semasa;</li>
              <li>Tiada caj untuk bulan seterusnya selepas pembatalan.</li>
            </ul>
            <h3 className="font-semibold mt-3">2.2 Langganan Tahunan</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Bayaran balik pro-rated tersedia jika dibatalkan selepas 14 hari tetapi dalam 30 hari dari pembayaran;</li>
              <li>Bayaran balik dikira berdasarkan bulan penuh yang belum digunakan;</li>
              <li>Selepas 30 hari, tiada bayaran balik untuk tempoh berbaki;</li>
              <li>Akses berterusan sehingga tamat tempoh tahunan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Situasi Khas — Bayaran Balik Penuh Dijamin</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Kegagalan teknikal major:</strong> platform tidak dapat diakses lebih 7 hari berturut-turut disebabkan WorkTrace;</li>
              <li><strong>Caj berganda:</strong> dicaj dua kali untuk langganan yang sama;</li>
              <li><strong>Caj tidak dibenarkan:</strong> anda boleh buktikan tidak membenarkan pembayaran;</li>
              <li><strong>Perkhidmatan ditamatkan oleh WorkTrace:</strong> bayaran balik pro-rated diberikan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Tidak Layak untuk Bayaran Balik</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Akaun digantung kerana melanggar Terma & Syarat;</li>
              <li>Permohonan selepas tempoh kelayakan;</li>
              <li>Dakwaan platform tidak memenuhi keperluan tanpa dimaklumkan dalam tempoh 14 hari;</li>
              <li>Pembelian kod diskaun atau kredit rujukan;</li>
              <li>Yuran bank atau pemproses pembayaran pihak ketiga.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Pemprosesan Bayaran Balik</h2>
            <p><strong>Masa pemprosesan:</strong> WorkTrace 1–3 hari bekerja; bank/kad 5–14 hari bekerja.</p>
            <p className="mt-1"><strong>Kaedah:</strong> Bayaran balik dikreditkan ke kaedah pembayaran asal. Jika tidak tersedia, kami akan menghubungi anda untuk alternatif.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Program Rujukan & Kredit</h2>
            <p>Kredit rujukan tidak boleh ditukar wang tunai dan akan dilupuskan apabila akaun ditamatkan. Kod diskaun yang telah digunakan tidak akan dikembalikan.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Hak Pengguna di bawah Undang-undang Malaysia</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Akta Perlindungan Pengguna 1999 (Akta 599);</li>
              <li>Akta Jualan Barangan 1957;</li>
              <li>Akta Komunikasi dan Multimedia 1998.</li>
            </ul>
            <p className="mt-2">Anda berhak menghubungi Tribunal Tuntutan Pengguna atau KPDNHEP jika hak anda dilanggar.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Hubungi Kami</h2>
            <p>Emel: <a className="underline" href="mailto:customerservice@worktrace.my">customerservice@worktrace.my</a></p>
            <p>Subjek: "Bayaran Balik — [Nombor Akaun Anda]"</p>
            <p>Masa tindak balas: 1 hari bekerja</p>
            <p>Waktu sokongan: Isnin–Jumaat, 9am–6pm (GMT+8)</p>
            <p className="mt-3 text-amber-700">⚠️ Sertakan bukti pembayaran (rujukan BillPlz / tangkapan skrin) untuk mempercepatkan proses.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

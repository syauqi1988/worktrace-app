import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useL } from '@/i18n/dual';

const Mail = () => <a className="underline" href="mailto:customerservice@worktrace.my">customerservice@worktrace.my</a>;

export default function RefundPolicyPage() {
  const l = useL();
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> {l('Back', 'Kembali')}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2 font-display">{l('Refund Policy', 'Dasar Bayaran Balik')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{l('WorkTrace — updated May 2026', 'WorkTrace — terkini Mei 2026')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">{l('1. 14-Day Refund Guarantee', '1. Jaminan Bayaran Balik 14 Hari')}</h2>
            <p>{l('WorkTrace offers a full refund guarantee within 14 days of your first payment for paid subscriptions (Pro or Team). This is a no-questions-asked guarantee for new customers.', 'WorkTrace menawarkan jaminan bayaran balik penuh dalam tempoh 14 hari dari tarikh pembayaran pertama anda untuk langganan berbayar (Pro atau Team). Ini adalah jaminan tanpa soal-jawab untuk pelanggan baru.')}</p>
            <h3 className="font-semibold mt-3">{l('1.1 Eligibility', '1.1 Syarat Kelayakan')}</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>{l('The 14-day refund applies only to the first payment of each account;', 'Bayaran balik 14 hari hanya terpakai untuk pembayaran pertama setiap akaun;')}</li>
              <li>{l('Requests must be sent within 14 calendar days of payment;', 'Permohonan mesti dihantar dalam tempoh 14 hari kalendar dari tarikh pembayaran;')}</li>
              <li>{l('Applies to the Pro plan (monthly or yearly) and the Team plan;', 'Terpakai untuk pelan Pro (bulanan atau tahunan) dan pelan Team;')}</li>
              <li>{l('Does not apply to the free plan.', 'Tidak terpakai untuk pelan percuma.')}</li>
            </ul>
            <h3 className="font-semibold mt-3">{l('1.2 How to Apply', '1.2 Cara Memohon')}</h3>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>{l('Email', 'Hantar emel ke')} <Mail /> {l('with the subject "Refund Request — [Account Name]";', 'dengan subjek "Permohonan Bayaran Balik — [Nama Akaun]";')}</li>
              <li>{l('Include your account number, payment date and amount paid;', 'Sertakan nombor akaun, tarikh pembayaran, dan jumlah yang dibayar;')}</li>
              <li>{l('Our team will process the request within 3–5 working days;', 'Pasukan kami akan memproses permohonan dalam masa 3–5 hari bekerja;')}</li>
              <li>{l('The refund will be credited to your original payment method.', 'Bayaran balik akan dikreditkan ke kaedah pembayaran asal anda.')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('2. Subscription Cancellation', '2. Pembatalan Langganan')}</h2>
            <h3 className="font-semibold">{l('2.1 Monthly Subscription', '2.1 Langganan Bulanan')}</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>{l('Can be cancelled anytime via Settings → Subscription;', 'Boleh dibatalkan bila-bila masa melalui Tetapan → Langganan;')}</li>
              <li>{l('No pro-rated refund for the current month after the 14-day period;', 'Tiada bayaran balik pro-rated untuk bulan semasa selepas tempoh 14 hari;')}</li>
              <li>{l('Pro access continues until the end of the current billing period;', 'Akses Pro berterusan sehingga tamat tempoh bil semasa;')}</li>
              <li>{l('No charge for the following month after cancellation.', 'Tiada caj untuk bulan seterusnya selepas pembatalan.')}</li>
            </ul>
            <h3 className="font-semibold mt-3">{l('2.2 Yearly Subscription', '2.2 Langganan Tahunan')}</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>{l('Pro-rated refund available if cancelled after 14 days but within 30 days of payment;', 'Bayaran balik pro-rated tersedia jika dibatalkan selepas 14 hari tetapi dalam 30 hari dari pembayaran;')}</li>
              <li>{l('Refunds are calculated based on full unused months;', 'Bayaran balik dikira berdasarkan bulan penuh yang belum digunakan;')}</li>
              <li>{l('After 30 days, no refund for the remaining period;', 'Selepas 30 hari, tiada bayaran balik untuk tempoh berbaki;')}</li>
              <li>{l('Access continues until the end of the yearly period.', 'Akses berterusan sehingga tamat tempoh tahunan.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('3. Special Cases — Full Refund Guaranteed', '3. Situasi Khas — Bayaran Balik Penuh Dijamin')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>{l('Major technical failure:', 'Kegagalan teknikal major:')}</strong> {l('platform inaccessible for more than 7 consecutive days due to WorkTrace;', 'platform tidak dapat diakses lebih 7 hari berturut-turut disebabkan WorkTrace;')}</li>
              <li><strong>{l('Double charge:', 'Caj berganda:')}</strong> {l('charged twice for the same subscription;', 'dicaj dua kali untuk langganan yang sama;')}</li>
              <li><strong>{l('Unauthorised charge:', 'Caj tidak dibenarkan:')}</strong> {l('you can prove you did not authorise the payment;', 'anda boleh buktikan tidak membenarkan pembayaran;')}</li>
              <li><strong>{l('Service terminated by WorkTrace:', 'Perkhidmatan ditamatkan oleh WorkTrace:')}</strong> {l('a pro-rated refund is given.', 'bayaran balik pro-rated diberikan.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('4. Not Eligible for Refund', '4. Tidak Layak untuk Bayaran Balik')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{l('Account suspended for violating the Terms & Conditions;', 'Akaun digantung kerana melanggar Terma & Syarat;')}</li>
              <li>{l('Requests after the eligibility period;', 'Permohonan selepas tempoh kelayakan;')}</li>
              <li>{l('Claims that the platform does not meet needs without notice within 14 days;', 'Dakwaan platform tidak memenuhi keperluan tanpa dimaklumkan dalam tempoh 14 hari;')}</li>
              <li>{l('Purchases of discount codes or referral credits;', 'Pembelian kod diskaun atau kredit rujukan;')}</li>
              <li>{l('Third-party bank or payment processor fees.', 'Yuran bank atau pemproses pembayaran pihak ketiga.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('5. Refund Processing', '5. Pemprosesan Bayaran Balik')}</h2>
            <p><strong>{l('Processing time:', 'Masa pemprosesan:')}</strong> {l('WorkTrace 1–3 working days; bank/card 5–14 working days.', 'WorkTrace 1–3 hari bekerja; bank/kad 5–14 hari bekerja.')}</p>
            <p className="mt-1"><strong>{l('Method:', 'Kaedah:')}</strong> {l('Refunds are credited to the original payment method. If unavailable, we will contact you for alternatives.', 'Bayaran balik dikreditkan ke kaedah pembayaran asal. Jika tidak tersedia, kami akan menghubungi anda untuk alternatif.')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('6. Referral Program & Credits', '6. Program Rujukan & Kredit')}</h2>
            <p>{l('Referral credits cannot be exchanged for cash and are forfeited when the account is terminated. Used discount codes will not be returned.', 'Kredit rujukan tidak boleh ditukar wang tunai dan akan dilupuskan apabila akaun ditamatkan. Kod diskaun yang telah digunakan tidak akan dikembalikan.')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('7. Consumer Rights under Malaysian Law', '7. Hak Pengguna di bawah Undang-undang Malaysia')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{l('Consumer Protection Act 1999 (Act 599);', 'Akta Perlindungan Pengguna 1999 (Akta 599);')}</li>
              <li>{l('Sale of Goods Act 1957;', 'Akta Jualan Barangan 1957;')}</li>
              <li>{l('Communications and Multimedia Act 1998.', 'Akta Komunikasi dan Multimedia 1998.')}</li>
            </ul>
            <p className="mt-2">{l('You may contact the Consumer Claims Tribunal or KPDN if your rights are violated.', 'Anda berhak menghubungi Tribunal Tuntutan Pengguna atau KPDNHEP jika hak anda dilanggar.')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{l('8. Contact Us', '8. Hubungi Kami')}</h2>
            <p>{l('Email:', 'Emel:')} <Mail /></p>
            <p>{l('Subject: "Refund — [Your Account Number]"', 'Subjek: "Bayaran Balik — [Nombor Akaun Anda]"')}</p>
            <p>{l('Response time: 1 working day', 'Masa tindak balas: 1 hari bekerja')}</p>
            <p>{l('Support hours: Monday–Friday, 9am–6pm (GMT+8)', 'Waktu sokongan: Isnin–Jumaat, 9am–6pm (GMT+8)')}</p>
            <p className="mt-3 text-amber-700">⚠️ {l('Include proof of payment (BillPlz reference / screenshot) to speed up the process.', 'Sertakan bukti pembayaran (rujukan BillPlz / tangkapan skrin) untuk mempercepatkan proses.')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

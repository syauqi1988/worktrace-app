import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2 font-display">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">WorkTrace — last updated May 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. 14-Day Full Refund Guarantee</h2>
            <p>WorkTrace offers a full refund guarantee within 14 days from your first payment date for paid subscriptions (Pro or Team). This is a no-questions-asked guarantee for new customers.</p>
            <h3 className="font-semibold mt-3">1.1 Eligibility Criteria</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>The 14-day refund applies only to the first payment of each account;</li>
              <li>Application must be submitted within 14 calendar days from the payment date;</li>
              <li>Applies to Pro (monthly or annual) and Team plans;</li>
              <li>Does not apply to free plans.</li>
            </ul>
            <h3 className="font-semibold mt-3">1.2 How to Apply</h3>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>Send an email to <a className="underline" href="mailto:customerservice@worktrace.my">customerservice@worktrace.my</a> with subject "Refund Request — [Account Name]";</li>
              <li>Include account number, payment date, and amount paid;</li>
              <li>Our team will process the application within 3–5 business days;</li>
              <li>The refund will be credited to your original payment method.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Subscription Cancellation</h2>
            <h3 className="font-semibold">2.1 Monthly Subscription</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Can be cancelled anytime via Settings → Subscription;</li>
              <li>No pro-rated refund for the current month after the 14-day period;</li>
              <li>Pro access continues until the end of the current billing period;</li>
              <li>No charges for the following month after cancellation.</li>
            </ul>
            <h3 className="font-semibold mt-3">2.2 Annual Subscription</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Pro-rated refund is available if cancelled after 14 days but within 30 days of payment;</li>
              <li>Refund is calculated based on full unused months;</li>
              <li>After 30 days, no refund for the remaining period;</li>
              <li>Access continues until the end of the annual period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Special Cases — Full Refund Guaranteed</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Major technical failure:</strong> platform inaccessible for more than 7 consecutive days due to WorkTrace;</li>
              <li><strong>Double charging:</strong> charged twice for the same subscription;</li>
              <li><strong>Unauthorized charge:</strong> you can prove you did not authorize the payment;</li>
              <li><strong>Service terminated by WorkTrace:</strong> pro-rated refund is given.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Not Eligible for Refund</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account suspended for violating Terms & Conditions;</li>
              <li>Application after the eligibility period;</li>
              <li>Claim that platform does not meet needs without notification within 14 days;</li>
              <li>Purchase of discount codes or referral credits;</li>
              <li>Bank or third-party payment processor fees.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Refund Processing</h2>
            <p><strong>Processing time:</strong> WorkTrace 1–3 business days; bank/card 5–14 business days.</p>
            <p className="mt-1"><strong>Method:</strong> Refund is credited to the original payment method. If unavailable, we will contact you for an alternative.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Referral Program & Credits</h2>
            <p>Referral credits cannot be exchanged for cash and will be forfeited when the account is terminated. Used discount codes will not be refunded.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. User Rights Under Malaysian Law</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Consumer Protection Act 1999 (Act 599);</li>
              <li>Sales of Goods Act 1957;</li>
              <li>Communications and Multimedia Act 1998.</li>
            </ul>
            <p className="mt-2">You are entitled to contact the Consumer Claims Tribunal or KPDNHEP if your rights are violated.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Contact Us</h2>
            <p>Email: <a className="underline" href="mailto:customerservice@worktrace.my">customerservice@worktrace.my</a></p>
            <p>Subject: "Refund — [Your Account Number]"</p>
            <p>Response time: 1 business day</p>
            <p>Support hours: Monday–Friday, 9am–6pm (GMT+8)</p>
            <p className="mt-3 text-amber-700">⚠️ Include proof of payment (BillPlz reference / screenshot) to speed up the process.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

import { Instagram, Twitter, Music2, Apple, Play } from "lucide-react";
import finovoLogo from "@/assets/finovo-logo.png";

export function Footer() {
  return (
    <footer className="mx-1 rounded-t-[4rem] bg-footer text-primary-foreground">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-10 pt-14 md:grid-cols-[1.3fr_0.6fr_0.8fr_1.2fr]">
        <div>
          <img src={finovoLogo} alt="Finovo logo" loading="lazy" className="h-24 w-24 rounded-2xl object-cover" />
          <p className="mt-4 text-lg font-semibold">Social Links</p>
          <div className="mt-3 flex gap-3">
            {[Instagram, Twitter, Music2].map((I, i) => <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-primary-foreground/40 bg-primary-foreground/15"><I size={15} /></a>)}
          </div>
        </div>
        <div><h4 className="text-lg font-semibold">Quick Links</h4><ul className="mt-3 space-y-2 text-xs">{["Home", "About", "Features", "Contact"].map((l) => <li key={l}><a href="#">{l}</a></li>)}</ul></div>
        <div className="space-y-3 text-xs"><h4 className="text-lg font-semibold">Contact</h4><p>support@finovo.com</p><p>+1 (123) 456-7890</p><p>123 Finovo Lane, Suite 100, City, State, ZIP</p></div>
        <div>
          <h4 className="text-lg font-semibold">App Coming Soon</h4>
          <p className="mt-3 text-xs opacity-90">Get our car rental app soon to search, book, and manage your ride anytime, anywhere.</p>
          <div className="mt-4 flex gap-3">
            <a href="#" className="flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-plum-deep px-3 py-1.5 text-[9px]"><Apple size={16} /><span>Available on the<br /><b className="text-[11px]">App Store</b></span></a>
            <a href="#" className="flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-plum-deep px-3 py-1.5 text-[9px]"><Play size={16} className="text-success" fill="currentColor" /><span>Get it on<br /><b className="text-[11px]">Google Play</b></span></a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl justify-between px-6 pb-6 pt-10 text-xs">
        <p>© 2026 <b>Finovo</b>. All Rights Reserved.</p>
        <div className="flex gap-8"><a href="#">Privacy Policy</a><a href="#">Terms &amp; Conditions</a></div>
      </div>
    </footer>
  );
}

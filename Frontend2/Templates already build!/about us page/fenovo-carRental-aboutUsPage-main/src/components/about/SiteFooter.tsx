import { Instagram, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinovoBrand, StoreButtons } from "@/components/finovo";

export function SiteFooter({ setNotice }: { setNotice: (notice: string) => void }) {
  return (
    <footer id="contact" className="site-footer"><div className="footer-top"><div><FinovoBrand footer /><h3>Social Links</h3><div className="social-links"><Button variant="navigation" size="icon" aria-label="Instagram" onClick={() => setNotice("Social Links")}><Instagram /></Button><Button variant="navigation" size="icon" aria-label="X" onClick={() => setNotice("Social Links")}><X /></Button><Button variant="navigation" size="icon" aria-label="TikTok" onClick={() => setNotice("Social Links")}><span className="tiktok">♪</span></Button></div></div><div><h3>Quick Links</h3><a href="#top">Home</a><a href="#story">About</a><a href="#why-us">Features</a><a href="#contact">Contact</a></div><div><h3>Contact</h3><a href="mailto:support@finovo.com">support@finovo.com</a><a href="tel:+11234567890">+1 (123) 456-7890</a><p>123 Finovo Lane, Suite<br />100, City, State, ZIP</p></div><div><h3>App Coming Soon</h3><p>Get our car rental app soon to search, book, and manage your ride anytime, anywhere.</p><StoreButtons onClick={() => setNotice("App Coming Soon")} /></div></div><div className="footer-bottom"><p>© 2026 <strong>Finovo.</strong> All Rights Reserved.</p><div><a href="#contact" onClick={e => { e.preventDefault(); setNotice("Privacy Policy"); }}>Privacy Policy</a><a href="#contact" onClick={e => { e.preventDefault(); setNotice("Terms & Conditions"); }}>Terms & Conditions</a></div></div></footer>
  );
}

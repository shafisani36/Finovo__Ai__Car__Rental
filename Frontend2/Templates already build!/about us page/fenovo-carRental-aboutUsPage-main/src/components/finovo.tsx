import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "../assets/finovo-logo.png";
import footerLogo from "../assets/finovo-footer-logo.png";
import googlePlay from "../assets/finovo-google-play.png";

export function FinovoBrand({ footer = false }: { footer?: boolean }) {
  return <a href="#top" aria-label="Finovo home" className={footer ? "footer-brand" : "brand"}><img src={footer ? footerLogo : logo} alt="Finovo company logo" />{!footer && <span>Finovo</span>}</a>;
}

export function StoreButtons({ onClick }: { onClick: () => void }) {
  return <div className="store-buttons"><Button variant="navigation" className="store-button" onClick={onClick}><Apple aria-hidden="true" /><span><small>Available on the</small>App Store</span></Button><Button variant="navigation" className="store-button" onClick={onClick}><img src={googlePlay} alt="" /><span><small>Get it on</small>Google Play</span></Button></div>;
}
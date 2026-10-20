import { Globe, Menu, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinovoBrand } from "@/components/finovo";
import avatar from "@/assets/finovo-avatar.png";

export function SiteHeader({ menuOpen, setMenuOpen, setNotice }: { menuOpen: boolean; setMenuOpen: (open: boolean) => void; setNotice: (notice: string) => void }) {
  const navigation = <><a href="#top">Home</a><a href="#get-moving">Cars</a><a href="#why-us">Insurance</a><a href="#story" className="active" aria-current="page">About Us</a><a href="#why-us">AI-Inspection</a><a href="#contact">Contact</a></>;
  return (
    <header className="site-header">
      <FinovoBrand />
      <nav className="desktop-nav" aria-label="Main navigation">{navigation}</nav>
      <div className="header-tools"><span className="theme-indicator" aria-hidden="true"><Sun size={12} /></span><Button variant="navigation" className="language" onClick={() => setNotice("Language")}><Globe /><span>EN</span><span className="chevron">⌄</span></Button><Button variant="navigation" className="account" onClick={() => setNotice("My Booking")}><img src={avatar} alt="" /><span>Login / My Booking</span></Button><Button variant="navigation" size="icon" className="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div>
      {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}>{navigation}</nav>}
    </header>
  );
}

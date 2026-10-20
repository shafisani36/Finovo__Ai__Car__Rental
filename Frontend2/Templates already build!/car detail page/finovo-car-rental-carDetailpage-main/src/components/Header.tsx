import { ShoppingCart, Heart, Globe } from "lucide-react";
import finovoLogo from "@/assets/finovo-logo.png";
import avatar from "@/assets/avatar.jpg";

const navItems = ["Home", "Cars", "Insurance", "About Us", "AI-Inspection", "Contact"];

export function Header() {
  return (
    <header className="bg-plum-deep text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <img src={finovoLogo} alt="Finovo logo" className="h-8 w-8 rounded-md object-cover" />
            Finovo
          </div>
          <nav className="hidden gap-5 text-xs md:flex">
            {navItems.map((n) => (
              <a key={n} href="#" className={n === "About Us" ? "font-semibold underline underline-offset-4" : "opacity-90 hover:opacity-100"}>{n}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <span className="relative"><ShoppingCart size={20} /><b className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-gold text-[10px] text-gold-foreground">1</b></span>
          <span className="relative"><Heart size={20} className="text-destructive" fill="currentColor" /><b className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-destructive text-[10px]">2</b></span>
          <span className="hidden h-6 w-12 items-center rounded-full bg-muted p-1 sm:flex"><span className="h-4 w-4 rounded-full bg-plum-deep" /></span>
          <span className="flex items-center gap-1"><Globe size={16} /> EN</span>
          <span className="flex items-center gap-2 rounded-full border border-primary-foreground/30 py-1 pl-1 pr-3">
            <img src={avatar} alt="" className="h-6 w-6 rounded-full object-cover" />Login / My Booking
          </span>
        </div>
      </div>
    </header>
  );
}

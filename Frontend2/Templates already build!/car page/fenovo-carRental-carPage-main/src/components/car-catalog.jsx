import { useId, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight, Droplet, Gauge, Globe, Grid2X2, List, Menu, Search, ShieldCheck, SlidersHorizontal, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "../assets/finovo-hero.png";
import red from "../assets/finovo-red-car.png";
import gray from "../assets/finovo-gray-car.png";
import blue from "../assets/finovo-blue-car.png";
import white from "../assets/finovo-white-car.png";
import yellow from "../assets/finovo-yellow-car.png";
import green from "../assets/finovo-green-car.png";
import bmw from "../assets/finovo-bmw-logo.png";
import lamborghini from "../assets/finovo-lamborghini-logo.png";
import city from "../assets/finovo-city.png";
import building from "../assets/finovo-building.png";
import avatar from "../assets/finovo-avatar.png";

const cars = [
  { id: 1, image: red, featured: true, brand: "Lamborghini", price: 1000, type: "Sports", fuel: "Electric" },
  { id: 2, image: gray, brand: "BMW", price: 500, type: "Sedan", fuel: "Electric" },
  { id: 3, image: blue, brand: "BMW", price: 500, type: "SUV", fuel: "Petrol" },
  { id: 4, image: gray, brand: "BMW", price: 500, type: "Sedan", fuel: "Electric" },
  { id: 5, image: white, brand: "BMW", price: 500, type: "Sedan", fuel: "Petrol", white: true },
  { id: 6, image: gray, brand: "BMW", price: 500, type: "Sedan", fuel: "Electric" },
  { id: 7, image: yellow, featured: true, brand: "Lamborghini", price: 1000, type: "Sports", fuel: "Petrol" },
  { id: 8, image: green, featured: true, brand: "Lamborghini", price: 1000, type: "Hatchback", fuel: "Petrol" },
  { id: 9, image: blue, brand: "BMW", price: 500, type: "SUV", fuel: "Petrol" },
];
const emptyFilters = { brand: "All Brands", type: "All Types", price: "Any Price", transmission: "Any", fuel: "Any" };
const filterOptions = [
  ["brand", "Brand", ["All Brands", "BMW", "Lamborghini"]],
  ["type", "Vehicle Type", ["All Types", "Sedan", "SUV", "Sports", "Hatchback"]],
  ["price", "Price Range", ["Any Price", "SAR 500 or less", "SAR 500–1,000"]],
  ["transmission", "Transmission", ["Any", "Automatic", "Manual"]],
  ["fuel", "Fuel Type", ["Any", "Electric", "Petrol"]],
];

function CarShape({ featured }) {
  const id = useId().replaceAll(":", "");
  const shape = featured ? "M5 63 C0 3 49 -5 123 5 L280 20 C375 -2 482 -5 506 26 C523 49 519 90 522 145 C526 177 497 188 464 188 L69 188 C26 190 5 171 5 135 Z" : "M5 73 C4 18 14 -1 60 3 C100 3 122 15 151 13 L219 5 C257 -1 267 14 267 48 L267 156 C267 180 255 188 236 188 L43 188 C15 188 3 175 3 148 Z";
  const width = featured ? 525 : 270;
  return <svg className="car-shape" viewBox={`0 0 ${width} 190`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" /><stop offset=".72" stopColor="var(--surface-white)" /><stop offset="1" stopColor="var(--surface-white)" /></linearGradient>
      <linearGradient id={`${id}-warm`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--card-warm)" /><stop offset="1" stopColor="var(--surface-white)" /></linearGradient>
      <clipPath id={`${id}-clip`}><path d={shape} /></clipPath>
    </defs>
    <g clipPath={`url(#${id}-clip)`}>
      <path d={shape} fill={`url(#${id}-gradient)`} />
      {!featured && <><image href={city.url} x="0" y="0" width="180" height="130" preserveAspectRatio="xMidYMid slice" /><path d="M0 132 C32 22 177 5 273 4 L273 190 L0 190 Z" fill={`url(#${id}-gradient)`} stroke="var(--surface-white)" strokeWidth="1.5" /></>}
      {featured && <><path d="M155 90 C190 33 345 2 449 3 C511 3 521 26 521 79 L525 136 L197 136 C164 136 143 116 155 90 Z" fill={`url(#${id}-warm)`} stroke="var(--surface-white)" strokeWidth="2" /><image href={building.url} x="300" y="-57" width="220" height="228" opacity=".18" preserveAspectRatio="xMidYMid slice" /></>}
    </g>
    <path d={shape} fill="none" stroke="var(--brand-violet)" strokeWidth="1.7" />
  </svg>;
}

function VehicleCard({ car, period, onOpen }) {
  const multiplier = period === "Weekly" ? 7 : period === "Monthly" ? 30 : 1;
  return <article className={`vehicle-card ${car.featured ? "featured" : ""}`}>
    <CarShape featured={car.featured} />
    {car.featured && <div className="featured-title"><h3>Lamborghini</h3><div className="year">2026</div><p>Unleash extraordinary performance.</p></div>}
    <img className={`car-photo ${car.white ? "white-car" : ""}`} src={car.image} alt={`${car.brand} ${car.featured ? "premium car" : "520 i"}`} />
    <span className="availability">Available</span>
    <div className="card-details">
      <img className="card-logo" src={car.featured ? lamborghini.url : bmw.url} alt={car.brand} />
      <div className="min-w-0 flex-1">
        {!car.featured && <><h3 className="card-name">BMW 520 i</h3><p className="card-year">2026</p></>}
        <div className="card-specs"><div className="card-spec"><Gauge /><div><strong>250 km</strong><span>Mileage</span></div></div><div className="card-spec"><Tag /><div><strong>SAR {(car.price * multiplier).toFixed(2)}</strong><span>{period} Fee</span></div></div></div>
      </div>
      <Button variant="car" size="icon" className="h-8 w-8" aria-label={`View ${car.brand} car ${car.id}`} onClick={() => onOpen(car)}><ChevronRight /></Button>
    </div>
  </article>;
}

export default function CarCatalog() {
  const [period, setPeriod] = useState("Daily");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [moreFilters, setMoreFilters] = useState(false);
  const [sort, setSort] = useState("Newest First");
  const [layout, setLayout] = useState("grid");
  const [page, setPage] = useState(1);
  const [selectedCar, setSelectedCar] = useState(null);
  const [nav, setNav] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seats, setSeats] = useState("Any");
  const [appliedSeats, setAppliedSeats] = useState("Any");
  const results = useMemo(() => {
    let result = cars.filter(car => `${car.brand} ${car.featured ? "" : "520 i"} 2026 ${car.type}`.toLowerCase().includes(search.toLowerCase()) && (applied.brand === "All Brands" || car.brand === applied.brand) && (applied.type === "All Types" || car.type === applied.type) && (applied.price !== "SAR 500 or less" || car.price <= 500) && (applied.fuel === "Any" || car.fuel === applied.fuel) && applied.transmission !== "Manual" && appliedSeats !== "7 seats");
    if (sort === "Price: Low to High") result.sort((a, b) => a.price - b.price);
    if (sort === "Price: High to Low") result.sort((a, b) => b.price - a.price);
    if (page > 1 && result.length) { const offset = (page - 1) % result.length; result = [...result.slice(offset), ...result.slice(0, offset)]; }
    return result;
  }, [search, applied, sort, page, appliedSeats]);
  const isFiltered = search || Object.keys(emptyFilters).some(key => applied[key] !== emptyFilters[key]) || appliedSeats !== "Any";
  const count = isFiltered ? results.length : 12;
  return <div className="finovo-page">
    <header className="site-header flex items-center justify-between bg-primary text-primary-foreground">
      <a href="/" className="flex items-center gap-2 text-base" aria-label="Finovo home"><span className="brand-mark">ϟ</span>Finovo</a>
      <nav className="site-nav flex items-center" aria-label="Main navigation">{["Home", "Cars", "Insurance", "About Us", "AI-Inspection", "Contact"].map(item => <a key={item} href={item === "Cars" ? "#cars" : "#"} onClick={event => { if (item !== "Cars") { event.preventDefault(); setNav(item); } }}>{item}</a>)}</nav>
      <div className="flex items-center gap-3"><Button variant="ghost" className="h-7 gap-2 px-2 text-xs" onClick={() => setNav("Language")} aria-label="Choose language"><Globe /> EN <ChevronDown className="size-3" /></Button><Button variant="ghost" className="hidden h-8 gap-2 px-0 text-[10px] sm:inline-flex" onClick={() => setNav("Login / My Booking")}><img src={avatar.url} className="h-5 w-5 rounded-full" alt="Account" />Login / My Booking</Button><Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></Button></div>
    </header>
    {mobileMenu && <nav className="flex flex-wrap justify-center gap-4 bg-primary px-5 pb-4 text-xs text-primary-foreground">{["Home", "Cars", "Insurance", "About Us", "AI-Inspection", "Contact"].map(item => <Button key={item} variant="ghost" onClick={() => { setNav(item); setMobileMenu(false); }}>{item}</Button>)}</nav>}
    <section className="hero text-primary-foreground">
      <img src={hero} className="hero-photo" alt="Purple Chevrolet Camaro parked beneath palm trees" fetchPriority="high" />
      <div className="hero-curve" />
      <div className="hero-copy"><p className="hero-kicker">EXTRAORDINARY CARS. MEMORABLE JOURNEYS.</p><h1 className="hero-title">Available Cars</h1><p className="hero-subtitle">Find your perfect drive from our premium collection of world-class vehicles.</p>
        <div className="hero-benefits"><div className="hero-benefit"><CarFront /><div><strong>Premium Fleet</strong><p>Latest Models</p></div></div><div className="hero-benefit"><CalendarDays /><div><strong>Flexible Rental</strong><p>Daily, Weekly, Monthly</p></div></div><div className="hero-benefit"><Globe /><div><strong>Trusted Worldwide</strong><p>Thousands of Happy Customers</p></div></div></div>
      </div>
      <div className="hero-signature">More<span>Than a Ride</span></div>
    </section>
    <form className="filter-panel" aria-label="Search & Filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); setAppliedSeats(seats); setPage(1); }}>
      <div className="filter-top"><label className="search-box"><Search className="size-4 shrink-0 text-primary" /><input aria-label="Search cars" placeholder="Search for your dream car..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
        <div className="period-tabs" aria-label="Rental period">{["Daily", "Weekly", "Monthly"].map(item => <Button type="button" key={item} variant={period === item ? "periodActive" : "period"} onClick={() => setPeriod(item)} aria-pressed={period === item}><CalendarDays className="size-3" />{item}</Button>)}</div>
        <div className="date-box"><CalendarDays className="size-4 shrink-0 text-muted-foreground" /><div><p className="mb-1 text-[9px] text-primary">Date Range</p><div className="flex items-center gap-1"><input aria-label="Rental start date" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(""); }} /><span className="text-xs">–</span><input aria-label="Rental end date" type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} /></div></div></div>
      </div>
      <div className="filter-bottom">{filterOptions.map(([key, label, options]) => <label className="filter-select" key={key}><span>{label}</span><select aria-label={label} value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}<Button type="button" className="h-full min-h-11 rounded-lg px-2 text-[10px]" onClick={() => setMoreFilters(!moreFilters)} aria-expanded={moreFilters}><SlidersHorizontal className="size-3" />More Filters</Button><Button variant="action" type="submit" className="h-full min-h-11 rounded-lg px-2 text-xs">Apply Filters<ChevronRight className="size-3" /></Button></div>
      {moreFilters && <div className="mt-3 flex items-end gap-3 border-t border-border pt-3"><label className="filter-select w-40"><span>Seats</span><select aria-label="Seats" value={seats} onChange={e => setSeats(e.target.value)}><option>Any</option><option>5 seats</option><option>7 seats</option></select></label><Button type="button" variant="ghost" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setSearch(""); setSeats("Any"); setAppliedSeats("Any"); }}>Reset filters</Button></div>}
    </form>
    <main className="catalog" id="cars"><div className="catalog-heading"><div><h2>{count} Cars Available</h2><p>Premium vehicles for every journey</p></div><div className="flex items-center gap-3 pt-3"><span className="hidden text-xs text-muted-foreground sm:inline">Sort by:</span><select aria-label="Sort cars" className="h-8 max-w-32 rounded-lg border border-border bg-card px-2 text-[10px]" value={sort} onChange={e => setSort(e.target.value)}><option>Newest First</option><option>Price: Low to High</option><option>Price: High to Low</option></select><div className="hidden rounded-lg bg-accent p-1 sm:flex"><Button variant={layout === 'grid' ? 'default' : 'ghost'} size="icon" className="h-6 w-6" aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 className="size-3" /></Button><Button variant={layout === 'list' ? 'default' : 'ghost'} size="icon" className="h-6 w-6" aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List className="size-3" /></Button></div></div></div>
      <div className={`car-grid ${layout === 'list' ? 'list-layout' : ''}`}>{results.map(car => <VehicleCard key={car.id} car={car} period={period} onOpen={setSelectedCar} />)}</div>
      {results.length === 0 && <div className="py-20 text-center"><CarFront className="mx-auto mb-4 size-10 text-muted-foreground" /><h3 className="text-lg font-semibold">No cars found</h3><p className="mt-2 text-sm text-muted-foreground">No vehicles match your selection.</p><Button variant="outline" className="mt-5" onClick={() => { setApplied(emptyFilters); setFilters(emptyFilters); setSearch(''); setSeats('Any'); setAppliedSeats('Any'); }}>Clear filters</Button></div>}
      <footer className="catalog-footer"><div className="footer-message flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-brand-violet"><Droplet className="size-4" /></span><div><h3 className="text-xs font-medium">Drive a Better Tomorrow</h3><p className="mt-1 text-[10px] text-muted-foreground">Sustainable journeys for a brighter future.</p></div></div><nav className="flex items-center gap-1" aria-label="Pagination"><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-accent" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-3" /></Button>{[1, 2, 3, 4, 5, 6].map(n => <Button key={n} variant={page === n ? 'pageActive' : 'page'} size="icon" className="h-7 w-7 text-[11px]" aria-label={`Page ${n}`} aria-current={page === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</Button>)}<span className="px-1 text-xs text-muted-foreground">...</span><Button variant={page === 10 ? 'pageActive' : 'page'} size="icon" className="h-7 w-7 text-[11px]" aria-label="Page 10" onClick={() => setPage(10)}>10</Button><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-accent" aria-label="Next page" disabled={page === 10} onClick={() => setPage(page + 1)}><ChevronRight className="size-3" /></Button></nav><div className="text-right"><p className="text-[10px] font-medium">{count} cars found</p><p className="mt-2 text-[9px] text-muted-foreground">LUXURY MOVES PEOPLE FORWARD</p></div></footer>
    </main>
    {(selectedCar || nav) && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-5" onClick={() => { setSelectedCar(null); setNav(null); }}><section role="dialog" aria-modal="true" aria-label={selectedCar ? 'Vehicle details' : nav} className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-xl" onClick={event => event.stopPropagation()}><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="Close dialog" onClick={() => { setSelectedCar(null); setNav(null); }}><X /></Button>{selectedCar ? <><span className="text-xs font-medium text-available">Available</span><img src={selectedCar.image} className="h-48 w-full object-contain" alt={selectedCar.brand} /><h2 className="text-2xl font-bold">{selectedCar.brand}{selectedCar.featured ? '' : ' 520 i'}</h2><p className="mt-2 text-sm text-muted-foreground">2026 · {selectedCar.type} · Automatic · {selectedCar.fuel}</p><div className="mt-5 flex justify-between border-t border-border pt-4"><span className="text-sm">250 km Mileage</span><strong>SAR {selectedCar.price.toFixed(2)} / day</strong></div></> : <><h2 className="pr-6 text-xl font-bold">{nav}</h2><p className="mt-4 text-sm text-muted-foreground">{nav === 'Language' ? 'English' : 'This page is not included in the supplied design.'}</p>{nav === 'Language' && <Button className="mt-4" onClick={() => setNav(null)}><Check />English</Button>}</>}</section></div>}
  </div>;
}
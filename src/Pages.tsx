import { Aperture, ArrowLeft, ArrowRight, Camera, Clapperboard, Film, Image, LockKeyhole, ShieldCheck, WandSparkles } from "lucide-react";
import { categories, projects } from "./data";

const nav = [
  ["Home", "/"], ["Portfolio", "/portfolio"], ["Services", "/services"],
  ["About", "/about"], ["Showreel", "/showreel"], ["Contact", "/contact"]
];

function SiteFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <div className="site-shell">
    <header className="site-header">
      <a className="brand" href="/" aria-label="Golden Films home">
        <span className="brand-mark"><Aperture size={28} strokeWidth={1.6} /></span>
        <span className="brand-copy"><strong>GOLDEN <em>FILMS</em></strong><small>PHOTOGRAPHY · FILMS · EDITING</small></span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <a className="button button-gold header-cta" href="/contact">Contact <ArrowRight size={15} /></a>
    </header>
    <main className="section-wrap" style={{ minHeight: "68vh", paddingTop: "64px", paddingBottom: "80px" }}>
      <p className="eyebrow"><span />{eyebrow}</p><h1>{title}</h1>{children}
      <p style={{ marginTop: 48 }}><a className="button button-outline" href="/"><ArrowLeft size={16} /> Back to Home</a></p>
    </main>
    <footer className="section-wrap" style={{ paddingTop: 24, paddingBottom: 24 }}>GOLDEN FILMS · Photography · Films · Editing</footer>
  </div>;
}

export default function Pages() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/portfolio") return <SiteFrame eyebrow="SELECTED STORIES" title="Portfolio">
    <p className="section-subtitle">Browse the portfolio categories. Current images are labelled demo content until real project media is supplied.</p>
    <div className="category-grid">{categories.map((item) => <article className="category-card" key={item.id}>
      <a className="category-image" href="/contact"><img src={item.image} alt={item.imageAlt.en} loading="lazy" /><span className="demo-tag">DEMO</span></a>
      <div className="category-card-copy"><h3>{item.title.en}</h3><p>{item.group}</p></div>
    </article>)}</div>
    <h2 style={{ marginTop: 48 }}>Featured projects</h2><div className="featured-grid">{projects.filter(p => p.featured).map(p => <article className="project-card" key={p.id}><div className="project-image"><img src={p.image} alt={p.imageAlt.en} loading="lazy" /><span className="demo-tag">DEMO</span></div><div className="project-card-copy"><h3>{p.title.en}</h3><p>{p.category.en}</p></div></article>)}</div>
  </SiteFrame>;
  if (path === "/services") return <SiteFrame eyebrow="WHAT WE CREATE" title="Creative Services">
    <p className="section-subtitle">Photography, filmmaking and editing for meaningful moments and brands.</p>
    <div className="services-grid">{[
      { Icon: Camera, title: "Photography", description: "Weddings, pre-weddings, portraits, events, fashion and products." },
      { Icon: Film, title: "Videography", description: "Cinematic wedding films, events and brand stories." },
      { Icon: WandSparkles, title: "Photo editing", description: "Retouching, colour correction and creative finishing." },
      { Icon: Clapperboard, title: "Video editing", description: "Cinematic cuts, colour grading, reels and short-form edits." }
    ].map(({ Icon, title, description }) => <article className="service-card" key={title}><span className="service-icon large"><Icon size={25} /></span><h2>{title}</h2><p>{description}</p><a className="text-link" href="/contact">Ask about this service <ArrowRight size={15}/></a></article>)}</div>
  </SiteFrame>;
  if (path === "/about") return <SiteFrame eyebrow="THE CREATIVE BEHIND THE LENS" title="About Golden Films">
    <p className="section-subtitle">Golden Films is a photography, videography, photo-editing and video-editing portfolio. The owner's approved biography and real project stories will be added when supplied.</p>
    <div className="categories-footnote"><Image size={16}/> Portfolio visuals currently contain sample/demo images, not verified client work.</div>
  </SiteFrame>;
  if (path === "/showreel") return <SiteFrame eyebrow="A MOVING PICTURE" title="Showreel">
    <p className="section-subtitle">Approved video links can be added here. No real showreel video has been supplied yet, so this page does not pretend demo media is an actual client film.</p>
    <div className="categories-footnote"><Film size={18}/> Showreel video: awaiting owner-provided or approved video URL.</div>
  </SiteFrame>;
  if (path === "/contact") return <SiteFrame eyebrow="LET'S MAKE SOMETHING MEANINGFUL" title="Contact & Project Enquiry">
    <p className="section-subtitle">The enquiry form currently lives on the home page. The backend is not yet deployed and database compatibility must be fixed before submissions can be accepted.</p>
    <a className="button button-gold" href="/#contact">Open enquiry form <ArrowRight size={16}/></a>
    <p style={{ marginTop: 24 }}>Phone, WhatsApp, email and Instagram contact details have not yet been provided by the site owner.</p>
  </SiteFrame>;
  if (path === "/login" || path === "/register" || path === "/admin") return <SiteFrame eyebrow="ADMIN AREA" title={path === "/login" ? "Admin Login" : path === "/register" ? "Initial Admin Setup" : "Admin Dashboard"}>
    <div className="service-card" style={{ maxWidth: 620 }}>
      <LockKeyhole size={30}/><h2>Authentication is not enabled yet</h2>
      <p>For security, this page will not accept passwords until the Worker API, session handling and database schema are configured and tested. No public registration or fake login has been enabled.</p>
      <p><ShieldCheck size={16}/> Next: safe initial-admin setup, password hashing, secure sessions, login rate limiting and protected admin routes.</p>
      <a className="text-link" href="/">Return to public website <ArrowRight size={15}/></a>
    </div>
  </SiteFrame>;
  return <SiteFrame eyebrow="PAGE NOT FOUND" title="404 — Page not found"><p className="section-subtitle">The page you requested does not exist.</p><a href="/" className="button button-gold">Go Home</a></SiteFrame>;
}

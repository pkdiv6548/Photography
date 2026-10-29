import { useEffect, useState, type FormEvent } from "react";
import { Aperture, ArrowLeft, ArrowRight, Camera, Clapperboard, Film, Image, LockKeyhole, ShieldCheck, WandSparkles, LogOut, LayoutDashboard } from "lucide-react";
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


function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("login_failed");
      window.location.replace("/admin");
    } catch {
      setStatus("error");
      setPassword("");
    }
  };

  return <SiteFrame eyebrow="SECURE ADMIN AREA" title="Admin Login">
    <div className="service-card" style={{ maxWidth: 520 }}>
      <LockKeyhole size={30}/><h2>Sign in to Golden Films</h2>
      <p className="section-subtitle">Use the owner account configured by the site administrator. Public registration is disabled.</p>
      <form className="enquiry-form" onSubmit={submit} style={{ marginTop: 24 }}>
        <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <span>Email address</span>
          <input autoComplete="username" type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} />
        </label>
        <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <span>Password</span>
          <input autoComplete="current-password" type="password" name="password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={128} />
        </label>
        {status === "error" && <p role="alert" className="form-notice">Sign-in failed or the admin service is not configured. Check your credentials or contact the site owner.</p>}
        <button className="button button-gold" type="submit" disabled={status === "sending"}>{status === "sending" ? "Signing in…" : "Sign in"} <ArrowRight size={15}/></button>
      </form>
      <p style={{ marginTop: 20, color: "#9a9d9f", fontSize: 12 }}><ShieldCheck size={15} style={{ verticalAlign: "middle", marginRight: 7 }}/> Passwords are sent only to the same-origin API over HTTPS.</p>
    </div>
  </SiteFrame>;
}

function AdminDashboardPage() {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated" | "error">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("session_unavailable");
        return response.json() as Promise<{ authenticated: boolean; admin?: { email: string } }>;
      })
      .then(data => {
        if (!active) return;
        if (!data?.authenticated || !data.admin) {
          setState("unauthenticated");
          window.location.replace("/login");
          return;
        }
        setEmail(data.admin.email);
        setState("authenticated");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }); }
    finally { window.location.replace("/login"); }
  };

  return <SiteFrame eyebrow="PRIVATE WORKSPACE" title="Admin Dashboard">
    {state === "loading" && <p className="section-subtitle">Checking your secure session…</p>}
    {state === "unauthenticated" && <p className="section-subtitle">Redirecting to sign in…</p>}
    {state === "error" && <div className="service-card"><h2>Admin service unavailable</h2><p>We could not verify your session. Please try again later.</p><a className="button button-outline" href="/login">Return to login</a></div>}
    {state === "authenticated" && <div>
      <div className="service-card" style={{ maxWidth: 760 }}>
        <LayoutDashboard size={28}/><h2>Welcome to your private workspace</h2>
        <p>Signed in as <strong>{email}</strong></p>
        <p className="section-subtitle">Authentication is connected. The enquiry inbox, portfolio editor, media uploads and publishing controls are not yet enabled.</p>
        <button type="button" className="button button-outline" onClick={logout}><LogOut size={15}/> Sign out</button>
      </div>
      <div className="services-grid" style={{ marginTop: 24 }}>
        <article className="service-card"><h2>Enquiries</h2><p>Private enquiry inbox and status management — implementation pending.</p></article>
        <article className="service-card"><h2>Portfolio & Media</h2><p>Photo/video upload, replacement and preview — implementation pending.</p></article>
        <article className="service-card"><h2>Page Content</h2><p>Draft, preview and publish workflow — implementation pending.</p></article>
      </div>
    </div>}
  </SiteFrame>;
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
  if (path === "/login") return <AdminLoginPage />;
  if (path === "/register") return <SiteFrame eyebrow="ADMIN AREA" title="Initial Admin Setup">
    <div className="service-card" style={{ maxWidth: 620 }}>
      <ShieldCheck size={30}/><h2>Public registration is disabled</h2>
      <p>The first owner account can only be created after a server-side setup secret is configured. This page never asks you to expose that secret in the browser.</p>
      <a className="text-link" href="/login">Go to admin login <ArrowRight size={15}/></a>
    </div>
  </SiteFrame>;
  if (path === "/admin") return <AdminDashboardPage />;
  return <SiteFrame eyebrow="PAGE NOT FOUND" title="404 — Page not found"><p className="section-subtitle">The page you requested does not exist.</p><a href="/" className="button button-gold">Go Home</a></SiteFrame>;
}

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

type AdminEnquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service: string;
  event_date: string | null;
  budget_range: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const defaultHomeContent: Record<string, string> = {
  heroTitleEn: "Moments into timeless stories.",
  heroTitleHi: "पलों को यादगार कहानियों में बदलें।",
  heroTextEn: "Photography, cinematic films and thoughtful editing for the moments and brands that matter.",
  heroTextHi: "खास पलों और ब्रांड्स के लिए फोटोग्राफी, सिनेमैटिक फिल्में और बेहतरीन एडिटिंग।",
  aboutTitleEn: "A story-led approach.",
  aboutTitleHi: "हर कहानी को समझकर बनाया गया काम।",
  aboutTextEn: "Golden Films is the creative portfolio of Sunil, bringing photography, filmmaking, photo editing and video editing together.",
  aboutTextHi: "Golden Films, सुनील का क्रिएटिव पोर्टफोलियो है, जिसमें फोटोग्राफी, फिल्ममेकिंग, फोटो एडिटिंग और वीडियो एडिटिंग शामिल हैं।",
  contactTitleEn: "Tell us about your story.",
  contactTitleHi: "अपनी कहानी के बारे में बताएँ।",
  contactTextEn: "Send your project details through the enquiry form.",
  contactTextHi: "अपने प्रोजेक्ट की जानकारी enquiry form के ज़रिए भेजें।",
};

const homeContentFields = [
  { key: "heroTitleEn", label: "Hero title · English", max: 120 },
  { key: "heroTitleHi", label: "Hero title · Hindi", max: 120 },
  { key: "heroTextEn", label: "Hero description · English", max: 500, multiline: true },
  { key: "heroTextHi", label: "Hero description · Hindi", max: 500, multiline: true },
  { key: "aboutTitleEn", label: "About heading · English", max: 120 },
  { key: "aboutTitleHi", label: "About heading · Hindi", max: 120 },
  { key: "aboutTextEn", label: "About text · English", max: 700, multiline: true },
  { key: "aboutTextHi", label: "About text · Hindi", max: 700, multiline: true },
  { key: "contactTitleEn", label: "Contact heading · English", max: 120 },
  { key: "contactTitleHi", label: "Contact heading · Hindi", max: 120 },
  { key: "contactTextEn", label: "Contact description · English", max: 500, multiline: true },
  { key: "contactTextHi", label: "Contact description · Hindi", max: 500, multiline: true },
] as const;

function AdminHomeContentEditor() {
  const [values, setValues] = useState<Record<string, string>>(defaultHomeContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/content", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (response.status === 401) {
          window.location.replace("/login");
          return null;
        }
        if (!response.ok) throw new Error("content_unavailable");
        return response.json() as Promise<{ pages?: Array<{ page_slug: string; draft_json: string; status: string }> }>;
      })
      .then(data => {
        if (!active || !data) return;
        const home = data.pages?.find(page => page.page_slug === "home");
        if (home) {
          try {
            const draft = JSON.parse(home.draft_json) as Record<string, unknown>;
            const merged = { ...defaultHomeContent };
            for (const key of Object.keys(merged)) if (typeof draft[key] === "string") merged[key] = draft[key] as string;
            setValues(merged);
            setSaved(false);
          } catch { /* Keep safe defaults if stored JSON is invalid. */ }
        }
      })
      .catch(() => { if (active) setMessage("Content storage is not available yet. Check the database migration before editing."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateValue = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setSaved(false);
    setMessage("");
  };

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/save", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: "home", content: values })
      });
      if (!response.ok) throw new Error("save_failed");
      setSaved(true);
      setMessage("Draft saved. Publish it when you are ready.");
    } catch {
      setMessage("Could not save the draft. Check the database migration and try again.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!saved || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/publish", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: "home" })
      });
      if (!response.ok) throw new Error("publish_failed");
      setMessage("Homepage content published.");
    } catch {
      setMessage("Could not publish. Save the draft and check the database migration.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="service-card" style={{ marginTop: 30 }}>
    <p className="eyebrow"><span/> CONTENT MANAGEMENT</p>
    <h2>Homepage content editor</h2>
    <p className="section-subtitle">Edit plain text in English and Hindi. Save a draft first, then publish explicitly. HTML and scripts are not accepted.</p>
    {loading && <p className="section-subtitle">Loading saved content…</p>}
    {!loading && <form onSubmit={saveDraft}>
      <div className="services-grid" style={{ marginTop: 20 }}>
        {homeContentFields.map(field => <label key={field.key} style={{ display: "grid", gap: 8, alignContent: "start", fontSize: 12 }}>
          <span>{field.label}</span>
          {("multiline" in field && field.multiline)
            ? <textarea value={values[field.key]} maxLength={field.max} rows={3} onChange={event => updateValue(field.key, event.target.value)} required style={{ width: "100%", resize: "vertical", padding: 12, color: "#eee", background: "#111416", border: "1px solid #45413a" }} />
            : <input value={values[field.key]} maxLength={field.max} onChange={event => updateValue(field.key, event.target.value)} required style={{ width: "100%", padding: 12, color: "#eee", background: "#111416", border: "1px solid #45413a" }} />}
        </label>)}
      </div>
      {message && <p role="status" className="form-notice" style={{ marginTop: 16 }}>{message}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
        <button className="button button-outline" type="submit" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
        <button className="button button-gold" type="button" disabled={!saved || saving} onClick={publish}>{saving ? "Working…" : "Publish homepage"}</button>
      </div>
    </form>}
  </section>;
}

function AdminDashboardPage() {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated" | "error">("loading");
  const [email, setEmail] = useState("");
  const [enquiries, setEnquiries] = useState<AdminEnquiry[]>([]);
  const [counts, setCounts] = useState<Array<{ status: string; count: number }>>([]);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [inboxState, setInboxState] = useState<"loading" | "ready" | "error">("loading");
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingId, setSavingId] = useState("");
  const [actionError, setActionError] = useState("");

  const loadInbox = async () => {
    setInboxState("loading");
    try {
      const query = filterStatus === "all" ? "" : "?status=" + encodeURIComponent(filterStatus);
      const response = await fetch("/api/admin/enquiries" + query, {
        credentials: "same-origin", cache: "no-store"
      });
      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("inbox_unavailable");
      const data = await response.json() as {
        enquiries: AdminEnquiry[];
        counts: Array<{ status: string; count: number }>;
        allowedStatuses: string[];
      };
      setEnquiries(data.enquiries ?? []);
      setCounts(data.counts ?? []);
      setAllowedStatuses(data.allowedStatuses ?? ["new"]);
      setInboxState("ready");
      setActionError("");
    } catch {
      setInboxState("error");
    }
  };

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

  useEffect(() => {
    if (state === "authenticated") void loadInbox();
  }, [state, filterStatus]);

  const updateStatus = async (enquiry: AdminEnquiry, status: string) => {
    if (status === enquiry.status || savingId) return;
    setSavingId(enquiry.id);
    setActionError("");
    try {
      const response = await fetch("/api/admin/enquiries/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: enquiry.id, status })
      });
      if (!response.ok) throw new Error("status_update_failed");
      await loadInbox();
    } catch {
      setActionError("Could not update this enquiry. Please retry.");
    } finally {
      setSavingId("");
    }
  };

  const logout = async () => {
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }); }
    finally { window.location.replace("/login"); }
  };

  return <SiteFrame eyebrow="PRIVATE WORKSPACE" title="Admin Dashboard">
    {state === "loading" && <p className="section-subtitle">Checking your secure session…</p>}
    {state === "unauthenticated" && <p className="section-subtitle">Redirecting to sign in…</p>}
    {state === "error" && <div className="service-card"><h2>Admin service unavailable</h2><p>We could not verify your session. Please try again later.</p><a className="button button-outline" href="/login">Return to login</a></div>}
    {state === "authenticated" && <div>
      <div className="service-card" style={{ maxWidth: 900 }}>
        <LayoutDashboard size={28}/><h2>Welcome to your private workspace</h2>
        <p>Signed in as <strong>{email}</strong></p>
        <p className="section-subtitle">Enquiry inbox is connected. Portfolio media uploads and page publishing are still under development.</p>
        <button type="button" className="button button-outline" onClick={logout}><LogOut size={15}/> Sign out</button>
      </div>
      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div><p className="eyebrow"><span/>PRIVATE CUSTOMER DATA</p><h2 style={{ margin: 0 }}>Project Enquiries</h2></div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            Filter
            <select value={filterStatus} onChange={event => setFilterStatus(event.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}>
              <option value="all">All statuses</option>
              {Array.from(new Set([...allowedStatuses, ...counts.map(item => item.status)])).map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
        </div>
        {counts.length > 0 && <div className="services-grid" style={{ marginTop: 20 }}>
          {counts.map(item => <article className="service-card" key={item.status}><p style={{ textTransform: "capitalize" }}>{item.status.replaceAll("_", " ")}</p><h2>{item.count}</h2></article>)}
        </div>}
        {actionError && <p role="alert" className="form-notice">{actionError}</p>}
        {inboxState === "loading" && <p className="section-subtitle">Loading private enquiries…</p>}
        {inboxState === "error" && <div className="service-card"><h3>Enquiry inbox unavailable</h3><p>The server could not load enquiries. Check database compatibility and try again.</p><button className="button button-outline" onClick={() => void loadInbox()}>Retry</button></div>}
        {inboxState === "ready" && enquiries.length === 0 && <div className="service-card" style={{ marginTop: 18 }}><h3>No enquiries found</h3><p className="section-subtitle">There are no enquiries matching this filter yet.</p></div>}
        {inboxState === "ready" && enquiries.map(enquiry => <article className="service-card" key={enquiry.id} style={{ marginTop: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            <div><p className="eyebrow"><span/> {enquiry.service.replaceAll("-", " ")}</p><h3 style={{ margin: "0 0 6px" }}>{enquiry.name}</h3><p className="section-subtitle">{enquiry.created_at}</p></div>
            <label style={{ display: "grid", alignContent: "start", gap: 6, fontSize: 12 }}>
              Status
              <select value={enquiry.status} disabled={savingId === enquiry.id} onChange={event => void updateStatus(enquiry, event.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}>
                {allowedStatuses.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
          </div>
          <p style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{enquiry.message}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "#c4c0b7", fontSize: 12 }}>
            {enquiry.email && <span>Email: {enquiry.email}</span>}
            {enquiry.phone && <span>Phone: {enquiry.phone}</span>}
            {enquiry.event_date && <span>Event date: {enquiry.event_date}</span>}
            {enquiry.budget_range && <span>Budget: {enquiry.budget_range}</span>}
          </div>
        </article>)}
      </section>
      <AdminHomeContentEditor />
      <div className="services-grid" style={{ marginTop: 30 }}>
        <article className="service-card"><h2>Portfolio & Media</h2><p>Photo/video upload, replacement and preview — implementation pending.</p></article>
        <article className="service-card"><h2>Page Content</h2><p>Homepage draft and publish editor is available above. Additional page sections are still under development.</p></article>
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

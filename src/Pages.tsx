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
    {new URLSearchParams(window.location.search).get("preview") === "1" && <div className="demo-banner">Draft preview — unpublished page content</div>}
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
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.toLowerCase().includes("application/json")) throw new Error("login_failed");
      const result = await response.json() as { ok?: boolean };
      if (result.ok !== true) throw new Error("login_failed");
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

type ContentRevision = { id: string; page_slug: string; revision_status: string; created_at: string };

function AdminContentRevisionHistory({ page, onRestored }: {
  page: string;
  onRestored: (content: Record<string, string>) => void;
}) {
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content/revisions?page=" + encodeURIComponent(page), {
        credentials: "same-origin", cache: "no-store"
      });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("revision_history_unavailable");
      const data = await response.json() as { revisions?: ContentRevision[] };
      setRevisions(data.revisions ?? []);
    } catch {
      setMessage("Revision history is unavailable until the CMS database migration is applied.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadRevisions(); }, [page]);

  const restore = async (revision: ContentRevision) => {
    if (busyId || !window.confirm("Restore this revision as a draft? The currently published content will not change until you publish.")) return;
    setBusyId(revision.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/restore", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revisionId: revision.id })
      });
      const data = await response.json() as { content?: Record<string, string> };
      if (!response.ok || !data.content) throw new Error("restore_failed");
      onRestored(data.content);
      setMessage("Revision restored as a draft. Review it before publishing.");
      await loadRevisions();
    } catch { setMessage("Could not restore this revision."); }
    finally { setBusyId(""); }
  };

  return <div style={{ marginTop: 24 }}>
    <h3>Revision history · {page}</h3>
    {loading && <p className="section-subtitle">Loading revisions…</p>}
    {!loading && revisions.length === 0 && <p className="section-subtitle">No saved revisions yet.</p>}
    {revisions.map(revision => <div key={revision.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #333" }}>
      <div><strong>{revision.revision_status}</strong><p className="section-subtitle">{revision.created_at}</p></div>
      <button className="button button-outline" type="button" disabled={Boolean(busyId)} onClick={() => void restore(revision)}>{busyId === revision.id ? "Restoring…" : "Restore as draft"}</button>
    </div>)}
    {message && <p role="status" className="form-notice">{message}</p>}
  </div>;
}

function AdminHomeContentEditor({ canPublish }: { canPublish: boolean }) {
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
        <button className="button button-outline" type="button" disabled={!saved || saving} onClick={() => window.open("/?preview=1", "_blank", "noopener,noreferrer")}>Preview draft</button>
        <button className="button button-gold" type="button" disabled={!canPublish || !saved || saving} onClick={publish}>{saving ? "Working…" : canPublish ? "Publish homepage" : "Owner only"}</button>
      </div>
    </form>}
    <AdminContentRevisionHistory page="home" onRestored={content => {
      const merged = { ...defaultHomeContent, ...content };
      setValues(merged);
      setSaved(true);
      setMessage("Revision restored as a draft. Review it before publishing.");
    }} />
  </section>;
}

type EditablePage = "about" | "services" | "showreel" | "contact";
type PageContentFields = Record<string, { label: string; max: number; multiline?: boolean; url?: boolean }>;
const secondaryPageFields: Record<EditablePage, PageContentFields> = {
  about: {
    titleEn: { label: "Page title · English", max: 120 }, titleHi: { label: "Page title · Hindi", max: 120 },
    textEn: { label: "Page text · English", max: 1200, multiline: true }, textHi: { label: "Page text · Hindi", max: 1200, multiline: true },
  },
  services: {
    titleEn: { label: "Page title · English", max: 120 }, titleHi: { label: "Page title · Hindi", max: 120 },
    introEn: { label: "Introduction · English", max: 500, multiline: true }, introHi: { label: "Introduction · Hindi", max: 500, multiline: true },
  },
  showreel: {
    titleEn: { label: "Page title · English", max: 120 }, titleHi: { label: "Page title · Hindi", max: 120 },
    textEn: { label: "Description · English", max: 700, multiline: true }, textHi: { label: "Description · Hindi", max: 700, multiline: true },
    videoUrl: { label: "Approved YouTube/Vimeo URL (optional)", max: 500, url: true },
  },
  contact: {
    titleEn: { label: "Page title · English", max: 120 }, titleHi: { label: "Page title · Hindi", max: 120 },
    textEn: { label: "Description · English", max: 700, multiline: true }, textHi: { label: "Description · Hindi", max: 700, multiline: true },
  },
};
const defaultSecondaryContent: Record<EditablePage, Record<string, string>> = {
  about: { titleEn: "About Golden Films", titleHi: "Golden Films के बारे में", textEn: "Golden Films is a photography, videography, photo-editing and video-editing portfolio.", textHi: "Golden Films फोटोग्राफी, वीडियोग्राफी, फोटो एडिटिंग और वीडियो एडिटिंग का पोर्टफोलियो है।" },
  services: { titleEn: "Creative Services", titleHi: "क्रिएटिव सेवाएँ", introEn: "Photography, filmmaking and editing for meaningful moments and brands.", introHi: "खास पलों और ब्रांड्स के लिए फोटोग्राफी, फिल्ममेकिंग और एडिटिंग।" },
  showreel: { titleEn: "Showreel", titleHi: "शो-रील", textEn: "Approved video links can be added here.", textHi: "यहाँ मंजूर किए गए वीडियो लिंक जोड़े जा सकते हैं।", videoUrl: "" },
  contact: { titleEn: "Contact & Project Enquiry", titleHi: "संपर्क और प्रोजेक्ट पूछताछ", textEn: "Tell us about your project and preferred contact details.", textHi: "अपने प्रोजेक्ट और संपर्क विवरण के बारे में बताएँ।" },
};

function AdminSecondaryContentEditor({ canPublish }: { canPublish: boolean }) {
  const [page, setPage] = useState<EditablePage>("about");
  const [values, setValues] = useState<Record<string, string>>(defaultSecondaryContent.about);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSaved(false);
    setMessage("");
    fetch("/api/admin/content", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (response.status === 401) { window.location.replace("/login"); return null; }
        if (!response.ok) throw new Error("content_unavailable");
        return response.json() as Promise<{ pages?: Array<{ page_slug: string; draft_json: string }> }>;
      })
      .then(data => {
        if (!active) return;
        let next = { ...defaultSecondaryContent[page] };
        const row = data?.pages?.find(item => item.page_slug === page);
        if (row) {
          try {
            const draft = JSON.parse(row.draft_json) as Record<string, unknown>;
            for (const key of Object.keys(next)) if (typeof draft[key] === "string") next[key] = draft[key] as string;
          } catch { /* Keep defaults if stored content is invalid. */ }
        }
        setValues(next);
      })
      .catch(() => { if (active) setMessage("Content storage is not available yet. Check the database migration."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/save", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page, content: values })
      });
      if (!response.ok) throw new Error("save_failed");
      setSaved(true);
      setMessage("Draft saved. Publish it when you are ready.");
    } catch { setMessage("Could not save the draft. Check the database migration and try again."); }
    finally { setSaving(false); }
  };

  const publish = async () => {
    if (!saved || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/publish", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page })
      });
      if (!response.ok) throw new Error("publish_failed");
      setMessage("Page content published.");
    } catch { setMessage("Could not publish. Save the draft and check the database migration."); }
    finally { setSaving(false); }
  };

  return <section className="service-card" style={{ marginTop: 24 }}>
    <p className="eyebrow"><span/> CONTENT MANAGEMENT</p><h2>Other page content</h2>
    <label style={{ display: "grid", gap: 8, maxWidth: 320, marginTop: 16, fontSize: 12 }}>
      Choose page
      <select value={page} onChange={event => setPage(event.target.value as EditablePage)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}>
        <option value="about">About</option><option value="services">Services</option><option value="showreel">Showreel</option><option value="contact">Contact</option>
      </select>
    </label>
    {loading ? <p className="section-subtitle">Loading saved content…</p> : <form onSubmit={saveDraft}>
      <div className="services-grid" style={{ marginTop: 20 }}>
        {Object.entries(secondaryPageFields[page]).map(([key, field]) => <label key={key} style={{ display: "grid", gap: 8, alignContent: "start", fontSize: 12 }}>
          <span>{field.label}</span>
          {field.multiline
            ? <textarea value={values[key] ?? ""} maxLength={field.max} rows={3} required onChange={event => { setValues(current => ({ ...current, [key]: event.target.value })); setSaved(false); }} style={{ width: "100%", resize: "vertical", padding: 12, color: "#eee", background: "#111416", border: "1px solid #45413a" }} />
            : <input type={field.url ? "url" : "text"} value={values[key] ?? ""} maxLength={field.max} required={!field.url} onChange={event => { setValues(current => ({ ...current, [key]: event.target.value })); setSaved(false); }} style={{ width: "100%", padding: 12, color: "#eee", background: "#111416", border: "1px solid #45413a" }} />}
        </label>)}
      </div>
      {message && <p role="status" className="form-notice" style={{ marginTop: 16 }}>{message}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
        <button className="button button-outline" type="submit" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
        <button className="button button-outline" type="button" disabled={!saved || saving} onClick={() => window.open("/" + page + "?preview=1", "_blank", "noopener,noreferrer")}>Preview draft</button>
        <button className="button button-gold" type="button" disabled={!canPublish || !saved || saving} onClick={publish}>{saving ? "Working…" : canPublish ? "Publish page" : "Owner only"}</button>
      </div>
    </form>}
    <AdminContentRevisionHistory page={page} onRestored={content => {
      const merged = { ...defaultSecondaryContent[page], ...content };
      setValues(merged);
      setSaved(true);
      setMessage("Revision restored as a draft. Review it before publishing.");
    }} />
  </section>;
}

function usePublishedPageContent(page: EditablePage) {
  const [content, setContent] = useState<Record<string, string>>({});
  const isDraftPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  useEffect(() => {
    let active = true;
    const endpoint = isDraftPreview
      ? "/api/admin/content/preview?page=" + encodeURIComponent(page)
      : "/api/content?page=" + encodeURIComponent(page);
    fetch(endpoint, { cache: "no-store", credentials: "same-origin" })
      .then(async response => {
        if (isDraftPreview && response.status === 401) { window.location.replace("/login"); return null; }
        return response.ok ? response.json() as Promise<{ content?: Record<string, string> }> : null;
      })
      .then(data => { if (active && data?.content) setContent(data.content); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [page, isDraftPreview]);
  return content;
}

function AboutContentPage() {
  const content = usePublishedPageContent("about");
  const values = [
    ["01", "Story before spectacle", "We start with the feeling, people and purpose behind each brief—not just a shot list."],
    ["02", "A considered process", "Planning, capture, selection and finishing are treated as one connected creative process."],
    ["03", "Honest presentation", "Portfolio placeholders are clearly labelled. Client stories and credentials are only added after approval."]
  ];
  return <SiteFrame eyebrow="THE CREATIVE BEHIND THE LENS" title={content.titleEn || "About Golden Films"}>
    <p className="section-subtitle">{content.textEn || "Golden Films brings photography, videography, photo editing and video editing together in one creative portfolio. The focus is on preserving meaningful moments and helping people and brands communicate visually."}</p>
    <div className="categories-footnote"><Image size={16}/> Portfolio visuals currently contain sample/demo images, not verified client work.</div>
    <section className="page-section"><p className="eyebrow"><span/> OUR POINT OF VIEW</p><h2>Good visuals do more than look beautiful.</h2><p className="section-subtitle">They help people remember a moment, understand a product and feel connected to a story.</p><div className="services-grid">{values.map(([n,t,d])=><article className="service-card" key={n}><span className="service-icon large">{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> WHAT WE BRING TOGETHER</p><h2>One visual story, from capture to finish.</h2><div className="services-grid">{[{i:"01",t:"Photography",d:"Still images for people, celebrations, products and brands."},{i:"02",t:"Videography",d:"Moving images shaped around atmosphere, action and story."},{i:"03",t:"Photo editing",d:"Careful retouching and consistent colour treatment."},{i:"04",t:"Video editing",d:"Pacing, sound, colour and formats suited to the intended audience."}].map(x=><article className="service-card" key={x.i}><p className="eyebrow">{x.i}</p><h3>{x.t}</h3><p>{x.d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> HOW WE WORK</p><h2>A clear path from brief to delivery.</h2><div className="services-grid">{["Listen to your goals","Plan the coverage","Create and capture","Edit and review","Deliver approved files"].map((t,i)=><article className="service-card" key={t}><span className="service-icon large">{String(i+1).padStart(2,"0")}</span><h3>{t}</h3><p>{["Understand the occasion, audience and priorities.","Agree the schedule, style and deliverables.","Work to the agreed brief and shot priorities.","Refine the selected work with focused feedback.","Prepare final files for the agreed use." ][i]}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> OUR COMMITMENT</p><h2>Clarity matters at every step.</h2><p className="section-subtitle">Scope, timing, delivery format and revisions should be agreed before work begins. Any published project story or client identity will be used only with permission.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> PORTFOLIO TRANSPARENCY</p><h2>Demo visuals are labelled honestly.</h2><p className="section-subtitle">The current website uses sample imagery to demonstrate the layout. It does not represent verified client work, awards or customer testimonials. Approved work can replace these samples when supplied.</p><a className="text-link" href="/portfolio">Explore portfolio categories <ArrowRight size={15}/></a></section>
    <section className="page-section"><p className="eyebrow"><span/> START A CONVERSATION</p><h2>Tell us what you want to create.</h2><p className="section-subtitle">Share the occasion, intended use, dates and the feeling you want the final work to convey.</p><a className="button button-gold" href="/contact">Discuss a project <ArrowRight size={15}/></a></section>
  </SiteFrame>;
}

function ServicesContentPage() {
  const content = usePublishedPageContent("services");
  const offers = [
    { Icon: Camera, title: "Photography", description: "Weddings, pre-weddings, portraits, events, fashion and products.", details: ["Story-led coverage and shot planning","Portraits, details and candid moments","Edited high-resolution image selection"], fit:"People, celebrations, products and brands" },
    { Icon: Film, title: "Videography", description: "Cinematic wedding films, events and brand stories.", details: ["Coverage plan and key moments","Story-focused footage capture","Edit-ready organised media"], fit:"Events, celebrations and promotional stories" },
    { Icon: WandSparkles, title: "Photo editing", description: "Retouching, colour correction and creative finishing.", details: ["Exposure and colour consistency","Careful portrait retouching","Export sizes matched to usage"], fit:"Photographers, creators and businesses" },
    { Icon: Clapperboard, title: "Video editing", description: "Cinematic cuts, colour grading, reels and short-form edits.", details: ["Story assembly and pacing","Colour and audio refinement","Social, web and presentation exports"], fit:"Creators, events and brand communications" }
  ];
  return <SiteFrame eyebrow="WHAT WE CREATE" title={content.titleEn || "Creative Services"}>
    <p className="section-subtitle">{content.introEn || "Photography, filmmaking and editing for meaningful moments and brands. Explore the scope, process and deliverables for each service."}</p>
    <section className="page-section"><p className="eyebrow"><span/> SERVICE MENU</p><h2>Choose the kind of story you need.</h2><div className="services-grid">{offers.map(({Icon,title,description,details,fit})=><article className="service-card" key={title}><span className="service-icon large"><Icon size={25}/></span><h2>{title}</h2><p>{description}</p><p><strong>Best for:</strong> {fit}</p><ul>{details.map(d=><li key={d}>{d}</li>)}</ul><a className="text-link" href={"/contact?service="+encodeURIComponent(title)}>Ask about this service <ArrowRight size={15}/></a></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> OUR PROCESS</p><h2>Simple, collaborative and clear.</h2><div className="services-grid">{[["01","Discover","We discuss your goals, date, audience and style."],["02","Plan","We align the brief, schedule, coverage and outputs."],["03","Create","The work is captured or edited against the agreed scope."],["04","Review","You review the agreed selection and share consolidated feedback."],["05","Deliver","Final files are prepared for the agreed channels and use."]].map(([n,t,d])=><article className="service-card" key={n}><p className="eyebrow">{n}</p><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> DELIVERABLES</p><h2>Know what you are commissioning.</h2><div className="services-grid">{[["Edited image gallery","Selected images delivered in agreed dimensions and formats."],["Film or highlight edit","A narrative edit shaped around the brief and available footage."],["Social cut-downs","Vertical and short-form versions when included in scope."],["Retouching and finishing","Consistent colour, cleanup and export quality." ]].map(([t,d])=><article className="service-card" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div><p className="section-subtitle">Exact quantities, turnaround, usage rights and revision rounds are confirmed in the project quote before work begins.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> PREPARING YOUR BRIEF</p><h2>Details that help us plan well.</h2><div className="categories-footnote">Share the date and location, event schedule, reference images, intended audience, delivery deadline, preferred formats and approximate budget. For editing-only work, explain what source files are available and the intended final platform.</div></section>
    <section className="page-section"><p className="eyebrow"><span/> QUALITY CHECKS</p><h2>Finishing is part of the craft.</h2><p className="section-subtitle">Before delivery, work should be checked for focus, exposure, colour consistency, audio clarity, spelling in graphics, export settings and suitability for the intended platform.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> COMMON QUESTIONS</p><div className="services-grid">{[["How much does a project cost?","Pricing depends on scope, hours, location, deliverables and editing requirements; request a quote for your brief."],["Can I request a particular style?","Yes—share reference images or links so expectations can be discussed before production."],["Are all images on this site client projects?","No. Sample visuals are marked as demo until verified work is supplied and approved."],["Can you edit footage I already have?","Editing-only requests can be discussed with details about file volume, format and desired output."]].map(([q,a])=><article className="service-card" key={q}><h3>{q}</h3><p>{a}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> READY WHEN YOU ARE</p><h2>Let's plan your project.</h2><p className="section-subtitle">Send the basics and we can clarify the right service, schedule and deliverables.</p><a className="button button-gold" href="/contact">Start an enquiry <ArrowRight size={15}/></a></section>
  </SiteFrame>;
}

function ShowreelContentPage() {
  const content = usePublishedPageContent("showreel");
  const chapters = [["01","The atmosphere","Establishing shots, spaces, light and the feeling of a place."],["02","The people","Expressions, interactions and the small moments between poses."],["03","The details","Textures, objects, styling and carefully observed details."],["04","The movement","Action, transitions and sequences that carry a story."],["05","The finish","Pacing, colour, sound and a final export suited to its audience."]];
  return <SiteFrame eyebrow="A MOVING PICTURE" title={content.titleEn || "Showreel"}>
    <p className="section-subtitle">{content.textEn || "A showreel brings stills, motion and editing together. This page is structured for an approved film link; no owner-provided showreel has been supplied yet."}</p>
    <section className="page-section"><p className="eyebrow"><span/> FEATURED FILM</p><h2>A place for the approved showreel.</h2>{content.videoUrl ? <div className="service-card"><p>Watch the published showreel using the approved external video link.</p><a className="button button-gold" href={content.videoUrl} target="_blank" rel="noopener noreferrer">Watch showreel <ArrowRight size={15}/></a></div> : <div className="categories-footnote"><Film size={18}/> Video pending: the owner must provide an approved YouTube/Vimeo URL. No fabricated video is embedded.</div>}</section>
    <section className="page-section"><p className="eyebrow"><span/> WHAT A REEL CAN SHOW</p><h2>Five chapters, one visual language.</h2><div className="services-grid">{chapters.map(([n,t,d])=><article className="service-card" key={n}><p className="eyebrow">{n}</p><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> STILL PHOTOGRAPHY</p><h2>Frames worth pausing for.</h2><div className="category-grid">{categories.filter(c=>c.group==="photography").slice(0,6).map(c=><article className="category-card" key={c.id}><a className="category-image" href="/portfolio"><img src={c.image} alt={c.imageAlt.en} loading="lazy"/><span className="demo-tag">DEMO</span></a><div className="category-card-copy"><h3>{c.title.en}</h3><p>Sample visual · not verified client work</p></div></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> MOTION & EDITING</p><h2>From footage to finished film.</h2><div className="services-grid">{[["Cinematic films","A narrative flow shaped around people and place."],["Event highlights","A concise recap of key moments and atmosphere."],["Brand stories","Visual communication built around a product, service or team."],["Short-form edits","Vertical versions for social platforms when requested."]].map(([t,d])=><article className="service-card" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> EDITING NOTES</p><h2>Finishing choices shape the feeling.</h2><p className="section-subtitle">Rhythm, colour, transitions, audio levels, titles and aspect ratio should support the story rather than distract from it.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> TRANSPARENCY</p><h2>Real work will be labelled accurately.</h2><p className="section-subtitle">Current images are demonstration assets. They are not represented as actual client projects, testimonials or awards. The showreel slot remains empty until an approved video is provided.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> SHARE YOUR BRIEF</p><h2>Have a film in mind?</h2><p className="section-subtitle">Tell us what the film should communicate, where it will be shown and when you need it.</p><a className="button button-gold" href="/contact">Discuss a film <ArrowRight size={15}/></a></section>
  </SiteFrame>;
}

function ContactContentPage() {
  const content = usePublishedPageContent("contact");
  const [service, setService] = useState(new URLSearchParams(window.location.search).get("service") || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (sending) return;
    const form = event.currentTarget; const data = new FormData(form);
    const payload = { name:String(data.get("name")||"").trim(), email:String(data.get("email")||"").trim(), phone:String(data.get("phone")||"").trim(), service, message:String(data.get("message")||"").trim(), consent:data.get("consent")==="on" };
    if (!payload.email && !payload.phone) { setResult("Please provide an email address or phone number."); return; }
    setSending(true); setResult("");
    try {
      const response = await fetch("/api/enquiries", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.error || "submit_failed");
      form.reset(); setService(""); setResult("Thank you—your enquiry was submitted.");
    } catch { setResult("The enquiry could not be submitted. Please try again later; no success has been assumed."); }
    finally { setSending(false); }
  };
  return <SiteFrame eyebrow="LET'S MAKE SOMETHING MEANINGFUL" title={content.titleEn || "Contact & Project Enquiry"}>
    <p className="section-subtitle">{content.textEn || "Tell us what you are planning, the service you need and how we can reach you. Contact details such as phone, WhatsApp and social links will be added when verified."}</p>
    <section className="page-section"><p className="eyebrow"><span/> PROJECT ENQUIRY</p><h2>Tell us the essentials.</h2><form className="enquiry-form service-card" onSubmit={submit}>
      <label>Name<input name="name" required maxLength={120} autoComplete="name"/></label>
      <label>Email<input name="email" type="email" maxLength={254} autoComplete="email"/></label>
      <label>Phone / WhatsApp<input name="phone" type="tel" maxLength={40} autoComplete="tel"/></label>
      <label>Service<select value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option>{["Photography","Videography","Photo editing","Video editing","Other"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <label>Project details<textarea name="message" required minLength={10} maxLength={3000} rows={6} placeholder="Date, location, project goals, deliverables and budget range…"/></label>
      <label className="consent-row"><input type="checkbox" name="consent" required/> I agree that Golden Films may use these details to respond to my enquiry.</label>
      <button className="button button-gold" type="submit" disabled={sending}>{sending?"Sending enquiry…":"Send enquiry"} <ArrowRight size={15}/></button>
      {result&&<p className="form-notice" role="status">{result}</p>}
    </form></section>
    <section className="page-section"><p className="eyebrow"><span/> WHAT HAPPENS NEXT</p><div className="services-grid">{[["01","We review the brief","We use your details only to understand and respond to the request."],["02","We clarify the scope","Date, location, deliverables and schedule can be confirmed before any commitment."],["03","We agree the next step","Availability, quote and delivery expectations need confirmation before booking."]].map(([n,t,d])=><article className="service-card" key={n}><p className="eyebrow">{n}</p><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="page-section"><p className="eyebrow"><span/> BEFORE YOU SEND</p><h2>Helpful details to include.</h2><p className="section-subtitle">Include your event date, venue or location, approximate hours, desired style, deadline, usage (personal or commercial) and the formats you need.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> CONTACT DETAILS</p><h2>Verified details only.</h2><p className="section-subtitle">Phone, WhatsApp, email and social account details have not yet been supplied, so this form is the available contact route. Do not rely on unverified contact information.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> PRIVACY</p><h2>Your enquiry should be handled carefully.</h2><p className="section-subtitle">Please do not submit passwords, payment card information or unrelated sensitive details. The form reports an error if the server does not confirm receipt.</p></section>
    <section className="page-section"><p className="eyebrow"><span/> OTHER WAYS TO EXPLORE</p><div className="services-grid"><a className="service-card" href="/services"><h3>Explore services <ArrowRight size={15}/></h3><p>Compare photography, video and editing options.</p></a><a className="service-card" href="/portfolio"><h3>Browse portfolio <ArrowRight size={15}/></h3><p>See categories and sample visuals, clearly labelled as demos.</p></a></div></section>
  </SiteFrame>;
}

type AdminProject = {
  id: string; slug: string; category_slug: string; cover_image_url: string; status: string; is_featured: number;
  location: string | null; project_date: string | null; demo_label: string; title_en?: string; title_hi?: string;
  description_en?: string; description_hi?: string;
};
type AdminProjectCategory = { slug: string; title_en: string; title_hi: string };
type AdminProjectMedia = { id: string; project_id: string; media_type: string; preview_url: string; alt_en: string; alt_hi: string; sort_order: number; is_public: number };

function AdminPortfolioManager({ canPublish }: { canPublish: boolean }) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [categories, setCategories] = useState<AdminProjectCategory[]>([]);
  const [media, setMedia] = useState<AdminProjectMedia[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [replacementUrls, setReplacementUrls] = useState<Record<string, string>>({});
  const [project, setProject] = useState({
    slug: "", categorySlug: "", titleEn: "", titleHi: "", descriptionEn: "", descriptionHi: "",
    coverImageUrl: "", status: "draft", isFeatured: false, location: "", projectDate: "", demoLabel: "Portfolio"
  });
  const [mediaForm, setMediaForm] = useState({
    mediaType: "image", previewUrl: "", altEn: "", altHi: "", sortOrder: "0", isPublic: false
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltEn, setUploadAltEn] = useState("");
  const [uploadAltHi, setUploadAltHi] = useState("");
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadIsCover, setUploadIsCover] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/projects", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("projects_unavailable");
      const data = await response.json() as { projects: AdminProject[]; categories: AdminProjectCategory[]; media: AdminProjectMedia[] };
      setProjects(data.projects ?? []);
      setCategories(data.categories ?? []);
      setMedia(data.media ?? []);
      setSelectedProjectId(current => current || data.projects?.[0]?.id || "");
      setProject(current => ({ ...current, categorySlug: current.categorySlug || data.categories?.[0]?.slug || "" }));
      setMessage("");
    } catch {
      setMessage("Portfolio database is unavailable. Check the schema migration and try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects/save", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(project)
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || "save_failed");
      setSelectedProjectId(data.id);
      setMessage("Project saved. Public visitors see it only when status is Published.");
      await load();
    } catch {
      setMessage("Could not save project. Check the category, HTTPS cover URL and database schema.");
    } finally { setSaving(false); }
  };

  const addMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProjectId) { setMessage("Save a project first, then add media."); return; }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects/media", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId, mediaType: mediaForm.mediaType, previewUrl: mediaForm.previewUrl,
          altEn: mediaForm.altEn, altHi: mediaForm.altHi, sortOrder: Number(mediaForm.sortOrder), isPublic: mediaForm.isPublic
        })
      });
      if (!response.ok) throw new Error("media_save_failed");
      setMediaForm(current => ({ ...current, previewUrl: "", altEn: "", altHi: "", isPublic: false }));
      setMessage("Hosted media URL saved.");
      await load();
    } catch {
      setMessage("Could not add media. Use an HTTPS URL and check that the project exists.");
    } finally { setSaving(false); }
  };

  const uploadMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProjectId || !uploadFile || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("projectId", selectedProjectId);
      form.append("altEn", uploadAltEn);
      form.append("altHi", uploadAltHi);
      form.append("sortOrder", "0");
      form.append("isPublic", String(uploadIsPublic));
      form.append("isCover", String(uploadIsCover));
      const response = await fetch("/api/admin/projects/media/upload", {
        method: "POST", credentials: "same-origin", body: form
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        if (data.error === "media_storage_not_configured") throw new Error("storage_not_configured");
        throw new Error(data.error || "upload_failed");
      }
      setUploadFile(null);
      setUploadAltEn("");
      setUploadAltHi("");
      setUploadIsPublic(false);
      setUploadIsCover(false);
      setMessage("File uploaded to private object storage.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error && error.message === "storage_not_configured"
        ? "Direct uploads are not active: the Cloudflare R2 bucket is not configured. URL-based media management remains available."
        : "Upload failed. Use a supported image/video file under 20 MB and check storage configuration.");
    } finally { setSaving(false); }
  };

  const replaceMedia = async (item: AdminProjectMedia) => {
    const previewUrl = replacementUrls[item.id]?.trim();
    if (!previewUrl || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects/media/replace", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, previewUrl, altEn: item.alt_en, altHi: item.alt_hi })
      });
      if (!response.ok) throw new Error("media_replace_failed");
      setReplacementUrls(current => ({ ...current, [item.id]: "" }));
      setMessage("Media URL replaced. The old hosted file was not deleted.");
      await load();
    } catch { setMessage("Could not replace this media URL."); }
    finally { setSaving(false); }
  };

  const hideMedia = async (item: AdminProjectMedia) => {
    if (saving || !window.confirm("Hide this media from the public portfolio? The external file will not be deleted.")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/projects/media/hide", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id })
      });
      if (!response.ok) throw new Error("media_hide_failed");
      setMessage("Media hidden from the public portfolio.");
      await load();
    } catch { setMessage("Could not hide this media."); }
    finally { setSaving(false); }
  };

  const selectedMedia = media.filter(item => item.project_id === selectedProjectId);
  return <section className="service-card" style={{ marginTop: 30 }}>
    <p className="eyebrow"><span/> PORTFOLIO MANAGEMENT</p><h2>Projects & hosted media</h2>
    <p className="section-subtitle">Create draft/published portfolio projects and manage HTTPS media URLs. Direct file uploads are unavailable until R2 storage is enabled and approved.</p>
    {loading && <p className="section-subtitle">Loading projects…</p>}
    {!loading && <form onSubmit={saveProject}>
      <h3 style={{ marginTop: 20 }}>Create or update project</h3>
      <div className="services-grid" style={{ marginTop: 16 }}>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Project slug
          <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={project.slug} onChange={e => setProject({ ...project, slug: e.target.value.toLowerCase() })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Category
          <select required value={project.categorySlug} onChange={e => setProject({ ...project, categorySlug: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}>
            {categories.map(item => <option key={item.slug} value={item.slug}>{item.title_en}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Title · English
          <input required maxLength={120} value={project.titleEn} onChange={e => setProject({ ...project, titleEn: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Title · Hindi
          <input required maxLength={120} value={project.titleHi} onChange={e => setProject({ ...project, titleHi: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Cover image HTTPS URL
          <input required type="url" value={project.coverImageUrl} onChange={e => setProject({ ...project, coverImageUrl: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Status
          <select disabled={!canPublish && project.status === "published"} value={project.status} onChange={e => setProject({ ...project, status: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}><option value="draft">Draft</option><option value="published">Published</option></select>
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Description · English
          <textarea maxLength={2000} rows={3} value={project.descriptionEn} onChange={e => setProject({ ...project, descriptionEn: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Description · Hindi
          <textarea maxLength={2000} rows={3} value={project.descriptionHi} onChange={e => setProject({ ...project, descriptionHi: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Location (optional)
          <input maxLength={120} value={project.location} onChange={e => setProject({ ...project, location: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Project date (optional)
          <input type="date" value={project.projectDate} onChange={e => setProject({ ...project, projectDate: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><input type="checkbox" checked={project.isFeatured} onChange={e => setProject({ ...project, isFeatured: e.target.checked })}/> Feature this project</label>
      </div>
      <button className="button button-gold" type="submit" disabled={saving || categories.length === 0 || (!canPublish && project.status === "published")} style={{ marginTop: 18 }}>{saving ? "Saving…" : "Save project"}</button>
    </form>}
    <div style={{ marginTop: 28 }}>
      <h3>Existing projects</h3>
      {projects.length === 0 ? <p className="section-subtitle">No projects have been added yet.</p> : <div className="services-grid">{projects.map(item => <article className="service-card" key={item.id}>
        <h3>{item.title_en || item.slug}</h3><p className="section-subtitle">{item.category_slug} · {item.status}</p><p>{item.description_en}</p>
        <button className="button button-outline" type="button" onClick={() => {
          setSelectedProjectId(item.id);
          setProject({ slug: item.slug, categorySlug: item.category_slug, titleEn: item.title_en || "", titleHi: item.title_hi || "", descriptionEn: item.description_en || "", descriptionHi: item.description_hi || "", coverImageUrl: item.cover_image_url, status: item.status, isFeatured: item.is_featured === 1, location: item.location || "", projectDate: item.project_date || "", demoLabel: item.demo_label || "Portfolio" });
        }}>Edit / manage media</button>
      </article>)}</div>}
    </div>
    <form onSubmit={addMedia} style={{ marginTop: 28 }}>
      <h3>Add hosted media URL</h3>
      <p className="section-subtitle">Media is hidden by default unless you check Publish this media. The external source file is never deleted by this site.</p>
      <div className="services-grid" style={{ marginTop: 16 }}>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Project
          <select required value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}>
            {projects.map(item => <option key={item.id} value={item.id}>{item.title_en || item.slug}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Media type
          <select value={mediaForm.mediaType} onChange={e => setMediaForm({ ...mediaForm, mediaType: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }}><option value="image">Image</option><option value="video">Video</option></select>
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>HTTPS media URL
          <input required type="url" value={mediaForm.previewUrl} onChange={e => setMediaForm({ ...mediaForm, previewUrl: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Alt text · English
          <input maxLength={250} value={mediaForm.altEn} onChange={e => setMediaForm({ ...mediaForm, altEn: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Alt text · Hindi
          <input maxLength={250} value={mediaForm.altHi} onChange={e => setMediaForm({ ...mediaForm, altHi: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Sort order
          <input type="number" min="0" max="10000" value={mediaForm.sortOrder} onChange={e => setMediaForm({ ...mediaForm, sortOrder: e.target.value })} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><input type="checkbox" disabled={!canPublish} checked={mediaForm.isPublic} onChange={e => setMediaForm({ ...mediaForm, isPublic: e.target.checked })}/> Publish this media</label>
      </div>
      <button className="button button-outline" type="submit" disabled={saving || !selectedProjectId} style={{ marginTop: 18 }}>Add media URL</button>
    </form>
    <form onSubmit={uploadMedia} style={{ marginTop: 28 }}>
      <h3>Upload image or video</h3>
      <p className="section-subtitle">Supported: JPEG, PNG, WebP, GIF, MP4 and WebM; maximum 20 MB. Upload stays disabled until an R2 bucket is configured.</p>
      <div className="services-grid" style={{ marginTop: 16 }}>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Choose file
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Alt text · English
          <input maxLength={250} value={uploadAltEn} onChange={e => setUploadAltEn(e.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Alt text · Hindi
          <input maxLength={250} value={uploadAltHi} onChange={e => setUploadAltHi(e.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" disabled={!canPublish} checked={uploadIsPublic} onChange={e => setUploadIsPublic(e.target.checked || uploadIsCover)} /> Publish this media
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" disabled={!canPublish} checked={uploadIsCover} onChange={e => { setUploadIsCover(e.target.checked); if (e.target.checked) setUploadIsPublic(true); }} /> Use as project cover (image only)
        </label>
      </div>
      <button className="button button-outline" type="submit" disabled={saving || !uploadFile || !selectedProjectId} style={{ marginTop: 18 }}>{saving ? "Uploading…" : "Upload media"}</button>
    </form>
    <div style={{ marginTop: 28 }}>
      <h3>Media items</h3>
      {selectedMedia.length === 0 ? <p className="section-subtitle">No media URLs are attached to this project yet.</p> : selectedMedia.map(item => <article className="service-card" key={item.id} style={{ marginTop: 12 }}>
        <p className="section-subtitle">{item.media_type} · {item.is_public ? "Public" : "Hidden"} · sort {item.sort_order}</p>
        <a href={item.preview_url} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>{item.preview_url}</a>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <input aria-label="Replacement HTTPS media URL" type="url" placeholder="Replacement HTTPS URL" value={replacementUrls[item.id] || ""} onChange={e => setReplacementUrls(current => ({ ...current, [item.id]: e.target.value }))} style={{ flex: "1 1 280px", padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
          <button className="button button-outline" type="button" disabled={saving || !replacementUrls[item.id] || (!canPublish && item.is_public === 1)} onClick={() => void replaceMedia(item)}>Replace URL</button>
          {item.is_public === 1 && canPublish && <button className="button button-outline" type="button" disabled={saving} onClick={() => void hideMedia(item)}>Hide</button>}
        </div>
      </article>)}
    </div>
    {message && <p role="status" className="form-notice" style={{ marginTop: 16 }}>{message}</p>}
    <button className="button button-outline" type="button" onClick={() => void load()} disabled={loading || saving} style={{ marginTop: 18 }}>Refresh projects</button>
  </section>;
}

type AuditEvent = { id: string; action: string; target_type: string; target_id: string; created_at: string; admin_email: string | null };

function AdminAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/audit", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("audit_unavailable");
      const data = await response.json() as { events?: AuditEvent[] };
      setEvents(data.events ?? []);
      setError("");
    } catch {
      setError("Audit log is unavailable until the backend and database schema are configured.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="service-card" style={{ marginTop: 30 }}>
    <p className="eyebrow"><span/> SECURITY & ACCOUNTABILITY</p><h2>Audit log</h2>
    <p className="section-subtitle">Recent admin logins, content changes, project publishing and media actions.</p>
    {loading && <p className="section-subtitle">Loading audit events…</p>}
    {error && <p role="status" className="form-notice">{error}</p>}
    {!loading && !error && events.length === 0 && <p className="section-subtitle">No audit events recorded yet.</p>}
    {!loading && events.map(event => <div key={event.id} style={{ padding: "12px 0", borderTop: "1px solid #333" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
        <strong>{event.action.replaceAll("_", " ")}</strong><span className="section-subtitle">{event.created_at}</span>
      </div>
      <p className="section-subtitle">{event.admin_email || "System / unknown admin"} · {event.target_type}{event.target_id ? " · " + event.target_id : ""}</p>
    </div>)}
    <button type="button" className="button button-outline" onClick={() => void load()} disabled={loading} style={{ marginTop: 16 }}>Refresh audit log</button>
  </section>;
}

type AdminSystemStatusData = {
  status: string;
  databaseConfigured: boolean;
  adminSetupSecretConfigured: boolean;
  adminSetupComplete: boolean;
  adminCount: number;
  adminRoleSchemaReady: boolean;
  enquirySchemaReady: boolean;
  portfolioSchemaReady: boolean;
  contentTablesReady: boolean;
  mediaStorageConfigured: boolean;
  blockers: string[];
};

function AdminSystemStatus() {
  const [data, setData] = useState<AdminSystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/system-status", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("status_unavailable");
      setData(await response.json() as AdminSystemStatusData);
      setError("");
    } catch { setError("System status unavailable. The Worker API may not be deployed or its D1 binding may be missing."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const checks = data ? [
    ["Database binding", data.databaseConfigured],
    ["Initial admin setup", data.adminSetupComplete],
    ["Owner/editor role schema", data.adminRoleSchemaReady],
    ["Enquiry schema + consent", data.enquirySchemaReady],
    ["Portfolio schema", data.portfolioSchemaReady],
    ["CMS tables", data.contentTablesReady],
    ["R2 media storage", data.mediaStorageConfigured],
    ["Setup secret", data.adminSetupSecretConfigured],
  ] as Array<[string, boolean]> : [];
  return <section className="service-card" style={{ marginTop: 24 }}>
    <p className="eyebrow"><span/> DEPLOYMENT READINESS</p><h2>System status</h2>
    <p className="section-subtitle">Read-only checks; this panel never applies migrations or changes account configuration.</p>
    {loading && <p className="section-subtitle">Checking API and database configuration…</p>}
    {error && <p role="status" className="form-notice">{error}</p>}
    {data && <>
      <div className="services-grid" style={{ marginTop: 16 }}>
        {checks.map(([label, ready]) => <article className="service-card" key={label}>
          <p>{label}</p><h3>{ready ? "Ready" : "Pending"}</h3>
        </article>)}
      </div>
      <p className="section-subtitle">Active admin accounts: {data.adminCount}</p>
      {data.blockers.length > 0 && <div style={{ marginTop: 16 }}><h3>Blockers</h3><ul>{data.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div>}
      {data.blockers.length === 0 && <p className="form-notice">Required services are configured.</p>}
    </>}
    <button type="button" className="button button-outline" onClick={() => void load()} disabled={loading} style={{ marginTop: 16 }}>Refresh system status</button>
  </section>;
}

type AdminUserRecord = { id: string; email: string; role: string; is_active: number; created_at: string; last_login_at: string | null };

function AdminUserManager() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("users_unavailable");
      const data = await response.json() as { users?: AdminUserRecord[] };
      setUsers(data.users ?? []);
      setMessage("");
    } catch { setMessage("User management requires the owner/editor role migration and backend deployment."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const createEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("create_failed");
      setEmail("");
      setPassword("");
      setMessage("Editor account created.");
      await load();
    } catch { setMessage("Could not create editor. Use a valid email and a password of at least 14 characters."); }
    finally { setSaving(false); }
  };

  const disableEditor = async (user: AdminUserRecord) => {
    if (saving || user.role !== "editor" || !window.confirm("Disable this editor and revoke their active sessions?")) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/disable", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: user.id })
      });
      if (!response.ok) throw new Error("disable_failed");
      setMessage("Editor disabled; active sessions revoked.");
      await load();
    } catch { setMessage("Could not disable this editor."); }
    finally { setSaving(false); }
  };

  return <section className="service-card" style={{ marginTop: 30 }}>
    <p className="eyebrow"><span/> ACCESS CONTROL</p><h2>Admin users</h2>
    <p className="section-subtitle">The owner can create and disable editor accounts. Editors can save drafts but cannot publish, expose media publicly, or manage users.</p>
    <form onSubmit={createEditor} style={{ marginTop: 18 }}>
      <div className="services-grid">
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Editor email
          <input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 12 }}>Temporary password (14+ characters)
          <input type="password" required minLength={14} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 10, background: "#111416", color: "#eee", border: "1px solid #45413a" }} />
        </label>
      </div>
      <button className="button button-gold" type="submit" disabled={saving} style={{ marginTop: 16 }}>{saving ? "Working…" : "Create editor"}</button>
    </form>
    <div style={{ marginTop: 24 }}>
      <h3>Accounts</h3>
      {loading && <p className="section-subtitle">Loading admin users…</p>}
      {!loading && users.map(user => <div key={user.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #333" }}>
        <div><strong>{user.email}</strong><p className="section-subtitle">{user.role} · {user.is_active ? "active" : "disabled"} · last login: {user.last_login_at || "never"}</p></div>
        {user.role === "editor" && user.is_active === 1 && <button className="button button-outline" type="button" disabled={saving} onClick={() => void disableEditor(user)}>Disable editor</button>}
      </div>)}
    </div>
    {message && <p role="status" className="form-notice" style={{ marginTop: 16 }}>{message}</p>}
    <button type="button" className="button button-outline" onClick={() => void load()} disabled={loading || saving} style={{ marginTop: 16 }}>Refresh users</button>
  </section>;
}

function AdminDashboardPage() {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated" | "error">("loading");
  const [email, setEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"owner" | "editor">("editor");
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
        return response.json() as Promise<{ authenticated: boolean; admin?: { email: string; role: "owner" | "editor" } }>;
      })
      .then(data => {
        if (!active) return;
        if (!data?.authenticated || !data.admin) {
          setState("unauthenticated");
          window.location.replace("/login");
          return;
        }
        setEmail(data.admin.email);
        setAdminRole(data.admin.role);
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
        <p className="section-subtitle">Role: {adminRole}. Editors can save drafts; only the owner can publish or manage admin accounts.</p>
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
      <AdminSystemStatus />
      <AdminHomeContentEditor canPublish={adminRole === "owner"} />
      <AdminSecondaryContentEditor canPublish={adminRole === "owner"} />
      <AdminPortfolioManager canPublish={adminRole === "owner"} />
      {adminRole === "owner" && <AdminUserManager />}
      {adminRole === "owner" && <AdminAuditLog />}
      <div className="services-grid" style={{ marginTop: 30 }}>
        <article className="service-card"><h2>Page Content</h2><p>Homepage and other page draft/publish editors are available above.</p></article>
      </div>
    </div>}
  </SiteFrame>;
}

type PublicProject = {
  id: string; slug: string; category_slug: string; cover_image_url: string; status: string; is_featured: number;
  location: string | null; project_date: string | null; title_en?: string; title_hi?: string;
  description_en?: string; description_hi?: string;
};
type PublicProjectMedia = { id: string; project_id: string; media_type: string; preview_url: string; alt_en: string; alt_hi: string; sort_order: number };

function PortfolioPageContent() {
  const [liveProjects, setLiveProjects] = useState<PublicProject[]>([]);
  const [liveMedia, setLiveMedia] = useState<PublicProjectMedia[]>([]);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let active = true;
    fetch("/api/projects?limit=48", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ projects?: PublicProject[]; media?: PublicProjectMedia[] }> : null)
      .then(data => {
        if (!active || !data) return;
        setLiveProjects(data.projects ?? []);
        setLiveMedia(data.media ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const visibleProjects = filter === "all" ? liveProjects : liveProjects.filter(project => project.category_slug === filter);
  return <SiteFrame eyebrow="SELECTED STORIES" title="Portfolio">
    <p className="section-subtitle">Browse portfolio categories and published projects. Sample cards remain labelled demo content until replaced by approved work.</p>
    <div className="category-grid">{categories.map(item => <article className="category-card" key={item.id}>
      <a className="category-image" href="/contact"><img src={item.image} alt={item.imageAlt.en} loading="lazy" /><span className="demo-tag">DEMO</span></a>
      <div className="category-card-copy"><h3>{item.title.en}</h3><p>{item.group}</p></div>
    </article>)}</div>
    {liveProjects.length > 0 ? <>
      <h2 style={{ marginTop: 48 }}>Published projects</h2>
      <div className="filter-row" style={{ marginTop: 16 }}>
        <button type="button" className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>All projects</button>
        {Array.from(new Set(liveProjects.map(project => project.category_slug))).map(slug => <button key={slug} type="button" className={"filter-chip" + (filter === slug ? " active" : "")} onClick={() => setFilter(slug)}>{categories.find(category => category.id === slug || category.id === slug.replace(/-/g, ""))?.title.en || slug.replaceAll("-", " ")}</button>)}
      </div>
      <div className="featured-grid">{visibleProjects.map(project => <article className="project-card" key={project.id}>
        <div className="project-image"><img src={project.cover_image_url} alt={project.title_en || project.slug} loading="lazy" /></div>
        <div className="project-card-copy"><h3>{project.title_en || project.slug}</h3><p>{project.category_slug.replaceAll("-", " ")}{project.location ? " · " + project.location : ""}</p>{project.description_en && <p className="section-subtitle">{project.description_en}</p>}
          {liveMedia.filter(item => item.project_id === project.id).map(item => item.media_type === "image"
            ? <a key={item.id} className="category-image" href={item.preview_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}><img src={item.preview_url} alt={item.alt_en || project.title_en || project.slug} loading="lazy" /></a>
            : <p key={item.id} style={{ marginTop: 10 }}><a className="text-link" href={item.preview_url} target="_blank" rel="noopener noreferrer">Watch video <ArrowRight size={15}/></a></p>)}
        </div>
      </article>)}</div>
    </> : <><h2 style={{ marginTop: 48 }}>Featured projects</h2><div className="featured-grid">{projects.filter(p => p.featured).map(p => <article className="project-card" key={p.id}><div className="project-image"><img src={p.image} alt={p.imageAlt.en} loading="lazy" /><span className="demo-tag">DEMO</span></div><div className="project-card-copy"><h3>{p.title.en}</h3><p>{p.category.en}</p></div></article>)}</div></>}
  </SiteFrame>;
}

export default function Pages() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/portfolio") return <PortfolioPageContent />;
  if (path === "/services") return <ServicesContentPage />;
  if (path === "/about") return <AboutContentPage />;
  if (path === "/showreel") return <ShowreelContentPage />;
  if (path === "/contact") return <ContactContentPage />;
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

import { useState } from "react";
import {
  ArrowDownRight, ArrowRight, Camera, Clapperboard, Menu, X,
  Instagram, MessageCircle, Mail, Phone, Sparkles
} from "lucide-react";

type Language = "en" | "hi";

const copy = {
  en: {
    navWork: "Selected work", navServices: "Services", navAbout: "About", navContact: "Contact",
    eyebrow: "PHOTOGRAPHY · FILMS · EDITING",
    heroTitle: "Stories that feel like",
    heroAccent: "golden hour.",
    heroText: "Honest moments, artfully framed. Cinematic photographs and films made to keep your memories close.",
    explore: "Explore the portfolio", contact: "Let’s create together",
    note: "A SAMPLE PORTFOLIO — DEMO IMAGERY",
    selected: "A few stories,",
    selectedAccent: "beautifully told.",
    selectedText: "A curated preview of the moments and moods Golden Films loves to capture.",
    viewAll: "Explore categories",
    servicesEyebrow: "WHAT WE DO",
    servicesTitle: "Made to be remembered.",
    servicesText: "From the first frame to the final grade, every detail has a purpose.",
    aboutEyebrow: "BEHIND THE LENS",
    aboutTitle: "One eye for detail. A heart for stories.",
    aboutText: "Golden Films is the creative portfolio of Sunil — bringing photography, filmmaking and post-production together to tell stories with warmth and intention.",
    aboutNote: "Sunil’s personal bio and real project details will be added here.",
    reelEyebrow: "THE FEELING IN MOTION",
    reelTitle: "Little moments. Lasting films.",
    reelText: "A cinematic showreel will live here. For now, this section is a preview of the Golden Films experience.",
    enquire: "Make an enquiry", contactEyebrow: "YOUR STORY, NEXT",
    contactTitle: "Have something special in mind?",
    contactText: "Tell us what you’re planning. We’ll take it from there.",
    formName: "Your name", formEmail: "Email address", formService: "What do you need?",
    formMessage: "Tell us a little about it", formSend: "Prepare enquiry", formHint: "This demo form does not send or store personal information yet.",
    footer: "Made with care, framed in light.", demo: "Demo image",
    categories: ["Weddings", "Pre-wedding", "Portraits", "Fashion", "Events", "Products"],
    serviceNames: ["Photography", "Cinematic films", "Photo retouching", "Video editing"],
    serviceDescriptions: ["Portraits, celebrations, products and meaningful everyday moments.", "Wedding films, event stories and promotional video content.", "Careful retouching, color balance and polished final images.", "Editing, color grading and vertical short-form videos."],
    formServices: ["Wedding photography", "Pre-wedding", "Portrait / fashion", "Event coverage", "Product / commercial", "Cinematic video", "Photo editing", "Video editing", "Other"]
  },
  hi: {
    navWork: "चुना हुआ काम", navServices: "सेवाएँ", navAbout: "परिचय", navContact: "संपर्क",
    eyebrow: "फोटोग्राफी · फिल्में · एडिटिंग",
    heroTitle: "ऐसी कहानियाँ, जिनमें हो",
    heroAccent: "गोल्डन ऑवर का जादू।",
    heroText: "सच्चे पल, कलात्मक अंदाज़ में। आपकी यादों को करीब रखने वाली सिनेमैटिक तस्वीरें और फिल्में।",
    explore: "पोर्टफोलियो देखें", contact: "साथ मिलकर कुछ बनाएँ",
    note: "सैंपल पोर्टफोलियो — डेमो तस्वीरें",
    selected: "कुछ कहानियाँ,",
    selectedAccent: "खूबसूरती से कही गईं।",
    selectedText: "उन पलों और एहसासों की झलक जिन्हें Golden Films कैमरे में कैद करना पसंद करता है।",
    viewAll: "सभी श्रेणियाँ देखें",
    servicesEyebrow: "हम क्या करते हैं",
    servicesTitle: "ऐसे पल, जो याद रहें।",
    servicesText: "पहले फ्रेम से अंतिम कलर ग्रेड तक, हर बारीकी का अपना महत्व है।",
    aboutEyebrow: "कैमरे के पीछे",
    aboutTitle: "नज़र बारीकियों पर। दिल कहानियों के साथ।",
    aboutText: "Golden Films, Sunil का क्रिएटिव पोर्टफोलियो है — फोटोग्राफी, फिल्ममेकिंग और पोस्ट-प्रोडक्शन के ज़रिए कहानियों को गर्मजोशी और उद्देश्य के साथ पेश करता है।",
    aboutNote: "Sunil का व्यक्तिगत परिचय और वास्तविक प्रोजेक्ट की जानकारी बाद में जोड़ी जाएगी।",
    reelEyebrow: "चलती तस्वीरों का एहसास",
    reelTitle: "छोटे पल। हमेशा रहने वाली फिल्में।",
    reelText: "यहाँ सिनेमैटिक शो-रील दिखाई जाएगी। फिलहाल यह Golden Films के अनुभव की एक झलक है।",
    enquire: "पूछताछ करें", contactEyebrow: "आपकी कहानी, अगली",
    contactTitle: "कुछ खास सोच रहे हैं?",
    contactText: "अपनी योजना के बारे में बताएँ। आगे की प्रक्रिया हम मिलकर तय करेंगे।",
    formName: "आपका नाम", formEmail: "ईमेल पता", formService: "आपको किस सेवा की ज़रूरत है?",
    formMessage: "थोड़ा विस्तार से बताएँ", formSend: "पूछताछ तैयार करें", formHint: "यह डेमो फॉर्म अभी आपकी निजी जानकारी न भेजता है, न सेव करता है।",
    footer: "ध्यान से बनाया, रोशनी में सँवारा।", demo: "डेमो तस्वीर",
    categories: ["शादी", "प्री-वेडिंग", "पोर्ट्रेट", "फैशन", "इवेंट", "प्रोडक्ट"],
    serviceNames: ["फोटोग्राफी", "सिनेमैटिक फिल्में", "फोटो रीटचिंग", "वीडियो एडिटिंग"],
    serviceDescriptions: ["पोर्ट्रेट, समारोह, प्रोडक्ट और रोज़मर्रा के खास पल।", "वेडिंग फिल्में, इवेंट स्टोरी और प्रमोशनल वीडियो।", "बारीक रीटचिंग, कलर बैलेंस और बेहतर फाइनल तस्वीरें।", "एडिटिंग, कलर ग्रेडिंग और वर्टिकल शॉर्ट वीडियो।"],
    formServices: ["वेडिंग फोटोग्राफी", "प्री-वेडिंग", "पोर्ट्रेट / फैशन", "इवेंट कवरेज", "प्रोडक्ट / कमर्शियल", "सिनेमैटिक वीडियो", "फोटो एडिटिंग", "वीडियो एडिटिंग", "अन्य"]
  }
};

const projects = [
  { title: "The Golden Vows", category: "Wedding Photography", image: "photo-1519741497674-611481863552", size: "tall" },
  { title: "Before the Forever", category: "Pre-Wedding", image: "photo-1537633552985-df8429e8048b", size: "wide" },
  { title: "Quiet Confidence", category: "Portrait", image: "photo-1534528741775-53994a69daeb", size: "normal" },
  { title: "Form & Feeling", category: "Fashion", image: "photo-1529139574466-a303027c1d8b", size: "normal" },
  { title: "A Night to Remember", category: "Events", image: "photo-1492684223066-81342ee5ff30", size: "wide" },
  { title: "Objects of Desire", category: "Product", image: "photo-1542291026-7eec264c27ff", size: "normal" }
];

const services = [
  { icon: Camera, key: 0 },
  { icon: Clapperboard, key: 1 },
  { icon: Sparkles, key: 2 },
  { icon: Clapperboard, key: 3 }
];

function photoUrl(id: string, width = 1000) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
}

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[language];

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEnquiry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent("Golden Films — Portfolio enquiry");
    const body = encodeURIComponent(
      `Name: ${form.get("name")}\nEmail: ${form.get("email")}\nService: ${form.get("service")}\nMessage: ${form.get("message")}\n\nDemo website: please confirm the real contact email before launch.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="site-shell">
      <div className="demo-ribbon"><span className="ribbon-dot" /> {t.note}</div>
      <header className="site-header">
        <button className="brand" onClick={() => scrollTo("home")} aria-label="Golden Films home">
          <span className="brand-mark">G<span>F</span></span>
          <span className="brand-copy"><strong>GOLDEN FILMS</strong><small>VISUAL STORIES BY SUNIL</small></span>
        </button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <button onClick={() => scrollTo("work")}>{t.navWork}</button>
          <button onClick={() => scrollTo("services")}>{t.navServices}</button>
          <button onClick={() => scrollTo("about")}>{t.navAbout}</button>
          <button className="nav-contact" onClick={() => scrollTo("contact")}>{t.navContact} <ArrowDownRight size={15} /></button>
        </nav>
        <div className="header-actions">
          <div className="language-switch" aria-label="Choose language">
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
            <span>/</span>
            <button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}>हि</button>
          </div>
          <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-image" role="img" aria-label="Demo wedding photography in warm evening light" />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow"><span />{t.eyebrow}</p>
            <h1>{t.heroTitle}<br /><em>{t.heroAccent}</em></h1>
            <p className="hero-text">{t.heroText}</p>
            <div className="hero-actions">
              <button className="button button-light" onClick={() => scrollTo("work")}>{t.explore} <ArrowRight size={16} /></button>
              <button className="text-link" onClick={() => scrollTo("contact")}>{t.contact}</button>
            </div>
          </div>
          <div className="hero-bottom"><span>01 / 06</span><span className="hero-bottom-line" /><span>JAIPUR · INDIA</span></div>
          <span className="hero-side-note">SAMPLE VISUALS · NOT CLIENT WORK</span>
        </section>

        <section className="intro section-wrap" id="work">
          <div className="section-heading">
            <p className="eyebrow"><span />SELECTED STORIES</p>
            <h2>{t.selected}<br /><em>{t.selectedAccent}</em></h2>
          </div>
          <div className="intro-aside"><p>{t.selectedText}</p><span className="aside-rule" /><span className="small-label">01 — 06 / PORTFOLIO PREVIEW</span></div>
        </section>

        <section className="portfolio-grid section-wrap" aria-label="Demo portfolio">
          {projects.map((project, index) => (
            <article className={`project-card ${project.size}`} key={project.title}>
              <div className="project-image-wrap">
                <img src={photoUrl(project.image, 1100)} alt={`${project.category} sample portfolio image`} loading={index < 2 ? "eager" : "lazy"} />
                <span className="image-demo-tag">{t.demo}</span>
                <span className="project-index">0{index + 1}</span>
                <button className="project-open" aria-label={`View sample ${project.title}`} onClick={() => scrollTo("contact")}><ArrowDownRight size={20} /></button>
              </div>
              <div className="project-caption"><div><h3>{project.title}</h3><p>{project.category}</p></div><span>DEMO</span></div>
            </article>
          ))}
          <button className="category-link" onClick={() => scrollTo("services")}>{t.viewAll} <ArrowRight size={17} /></button>
        </section>

        <section className="services-section" id="services">
          <div className="section-wrap services-inner">
            <div className="services-heading">
              <p className="eyebrow"><span />{t.servicesEyebrow}</p>
              <h2>{t.servicesTitle}</h2><p>{t.servicesText}</p>
            </div>
            <div className="service-list">
              {services.map(({ icon: Icon, key }) => (
                <button className="service-row" key={key} onClick={() => scrollTo("contact")}>
                  <span className="service-icon"><Icon size={19} strokeWidth={1.5} /></span>
                  <span className="service-copy"><strong>{t.serviceNames[key]}</strong><small>{t.serviceDescriptions[key]}</small></span>
                  <ArrowDownRight className="service-arrow" size={20} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section section-wrap" id="about">
          <div className="about-image">
            <img src={photoUrl("photo-1516035069371-29a1b244cc32", 1000)} alt="Camera equipment, demo visual" loading="lazy" />
            <span className="image-demo-tag">DEMO IMAGE</span>
          </div>
          <div className="about-copy">
            <p className="eyebrow"><span />{t.aboutEyebrow}</p>
            <h2>{t.aboutTitle}</h2>
            <p className="about-text">{t.aboutText}</p>
            <p className="about-placeholder">{t.aboutNote}</p>
            <button className="underlined-link" onClick={() => scrollTo("contact")}>{t.contact} <ArrowRight size={16} /></button>
          </div>
        </section>

        <section className="reel-section">
          <div className="reel-background" />
          <div className="reel-content">
            <p className="eyebrow"><span />{t.reelEyebrow}</p>
            <h2>{t.reelTitle}</h2>
            <p>{t.reelText}</p>
            <span className="reel-stamp"><Clapperboard size={18} /> GOLDEN FILMS · SAMPLE SHOWREEL</span>
          </div>
        </section>

        <section className="contact-section section-wrap" id="contact">
          <div className="contact-heading">
            <p className="eyebrow"><span />{t.contactEyebrow}</p>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactText}</p>
            <div className="contact-methods">
              <span><MessageCircle size={17} /> WhatsApp — details to be added</span>
              <span><Phone size={17} /> Phone — details to be added</span>
              <span><Mail size={17} /> Email — details to be added</span>
              <span><Instagram size={17} /> Instagram — details to be added</span>
            </div>
          </div>
          <form className="enquiry-form" onSubmit={handleEnquiry}>
            <label>{t.formName}<input name="name" required autoComplete="name" /></label>
            <label>{t.formEmail}<input name="email" type="email" required autoComplete="email" /></label>
            <label>{t.formService}<select name="service" required defaultValue=""><option value="" disabled>—</option>{t.formServices.map((service) => <option key={service}>{service}</option>)}</select></label>
            <label>{t.formMessage}<textarea name="message" rows={3} required /></label>
            <button className="button button-dark" type="submit">{t.formSend} <ArrowRight size={16} /></button>
            <p className="form-hint">{t.formHint}</p>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <button className="brand footer-brand" onClick={() => scrollTo("home")}><span className="brand-mark">G<span>F</span></span><span className="brand-copy"><strong>GOLDEN FILMS</strong><small>VISUAL STORIES BY SUNIL</small></span></button>
        <p>{t.footer}</p>
        <div><span>© {new Date().getFullYear()} GOLDEN FILMS</span><span>DEMO BUILD · EN / HI</span></div>
      </footer>
    </div>
  );
}
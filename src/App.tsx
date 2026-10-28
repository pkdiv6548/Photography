import { useMemo, useState, type FormEvent } from "react";
import {
  Aperture, ArrowDownRight, ArrowRight, Camera, Check, Clapperboard,
  Film, Image as ImageIcon, Languages, Menu, MessageCircle, Play, Send, Sparkles,
  WandSparkles, X
} from "lucide-react";
import { categories, heroImage, projects, type Language, type PortfolioGroup } from "./data";

const copy = {
  en: {
    nav: ["Home", "Portfolio", "Services", "About", "Showreel", "Contact"],
    eyebrow: "PHOTOGRAPHY · FILMMAKING · EDITING",
    heroTitle: "Moments into timeless stories.",
    heroText: "Photography, cinematic films and thoughtful editing for the moments and brands that matter.",
    viewPortfolio: "Explore portfolio",
    contactSunil: "Contact Sunil",
    demo: "DEMO PORTFOLIO",
    sampleNotice: "Sample visuals are for layout preview only — they are not Sunil's real client work.",
    categoriesEyebrow: "EXPLORE OUR WORK",
    categoriesTitle: "Portfolio categories",
    categoriesText: "A place for every story, from intimate portraits to cinematic celebrations.",
    filters: ["All work", "Photography", "Videography", "Editing"],
    featuredEyebrow: "SELECTED STORIES",
    featuredTitle: "Featured portfolio",
    featuredText: "A small preview of how your work will be presented.",
    servicesEyebrow: "WHAT WE CREATE",
    servicesTitle: "Creative services",
    servicesText: "One creative partner for capturing, shaping and finishing your visuals.",
    learnMore: "Explore category",
    aboutEyebrow: "THE CREATIVE BEHIND THE LENS",
    aboutTitle: "A story-led approach.",
    aboutText: "Golden Films is the creative portfolio of Sunil, bringing photography, filmmaking, photo editing and video editing together. Sunil's personal bio and real project stories will be added after they are provided and approved.",
    aboutPlaceholder: "Personal bio to be added",
    showreelEyebrow: "A MOVING PICTURE",
    showreelTitle: "Showreel preview",
    showreelText: "These are demo thumbnails. Real film links can be added when approved videos are available.",
    previewOnly: "Preview only",
    contactEyebrow: "LET'S MAKE SOMETHING MEANINGFUL",
    contactTitle: "Tell us about your story.",
    contactText: "Send your project details through the enquiry form. Submissions are stored securely once the live backend is configured.",
    formName: "Your name",
    formEmail: "Email address",
    formPhone: "Phone / WhatsApp",
    formService: "Service you need",
    formChoose: "Choose a service",
    formDate: "Event date (optional)",
    formBudget: "Budget range (optional)",
    formMessage: "Tell us a little about the project",
    formSubmit: "Send enquiry",
    formSending: "Sending…",
    formHeading: "PROJECT ENQUIRY",
    formConnected: "Secure submission",
    formNotice: "Your enquiry was received. We will get back to you.",
    formError: "We could not send your enquiry. Please try again later or contact us another way.",
    formRequiredContact: "Please enter an email address or phone number.",
    consentRequired: "Please confirm that we may use these details to respond to your enquiry.",
    consentLabel: "I agree that Golden Films may use the details above to respond to my enquiry.",
    contactDetails: "Sunil's phone, WhatsApp, email and Instagram details will be connected before launch.",
    footerLine: "Capturing moments. Crafting memories.",
    quickLinks: "Explore",
    services: "Services",
    contact: "Contact",
    demoLabel: "Demo image",
    allRights: "All sample projects and images are for demonstration only."
  },
  hi: {
    nav: ["होम", "पोर्टफोलियो", "सेवाएँ", "परिचय", "शो-रील", "संपर्क"],
    eyebrow: "फोटोग्राफी · फिल्ममेकिंग · एडिटिंग",
    heroTitle: "पलों को यादगार कहानियों में बदलें।",
    heroText: "खास पलों और ब्रांड्स के लिए फोटोग्राफी, सिनेमैटिक फिल्में और बेहतरीन एडिटिंग।",
    viewPortfolio: "पोर्टफोलियो देखें",
    contactSunil: "सुनील से संपर्क करें",
    demo: "डेमो पोर्टफोलियो",
    sampleNotice: "ये नमूना तस्वीरें केवल वेबसाइट के प्रीव्यू के लिए हैं — ये सुनील के वास्तविक क्लाइंट प्रोजेक्ट नहीं हैं।",
    categoriesEyebrow: "हमारा काम देखें",
    categoriesTitle: "पोर्टफोलियो कैटेगरी",
    categoriesText: "पोर्ट्रेट से लेकर सिनेमैटिक समारोहों तक, हर कहानी के लिए एक जगह।",
    filters: ["सभी काम", "फोटोग्राफी", "वीडियोग्राफी", "एडिटिंग"],
    featuredEyebrow: "चुनी हुई कहानियाँ",
    featuredTitle: "फीचर्ड पोर्टफोलियो",
    featuredText: "यह आपके काम को दिखाने के तरीके का एक छोटा प्रीव्यू है।",
    servicesEyebrow: "हम क्या बनाते हैं",
    servicesTitle: "क्रिएटिव सेवाएँ",
    servicesText: "आपके विजुअल्स को शूट करने, सँवारने और पूरा करने के लिए एक क्रिएटिव पार्टनर।",
    learnMore: "कैटेगरी देखें",
    aboutEyebrow: "कैमरे के पीछे की रचनात्मकता",
    aboutTitle: "हर कहानी को समझकर बनाया गया काम।",
    aboutText: "Golden Films, सुनील का क्रिएटिव पोर्टफोलियो है, जिसमें फोटोग्राफी, फिल्ममेकिंग, फोटो एडिटिंग और वीडियो एडिटिंग शामिल हैं। सुनील का वास्तविक परिचय और प्रोजेक्ट कहानियाँ जानकारी मिलने और मंजूरी के बाद जोड़ी जाएँगी।",
    aboutPlaceholder: "व्यक्तिगत परिचय बाद में जोड़ा जाएगा",
    showreelEyebrow: "चलती तस्वीरों की कहानी",
    showreelTitle: "शो-रील प्रीव्यू",
    showreelText: "ये डेमो थंबनेल हैं। मंजूर किए गए वीडियो उपलब्ध होने पर असली फिल्म लिंक जोड़े जा सकते हैं।",
    previewOnly: "केवल प्रीव्यू",
    contactEyebrow: "आइए कुछ खास बनाएँ",
    contactTitle: "अपनी कहानी के बारे में बताएँ।",
    contactText: "अपने प्रोजेक्ट की जानकारी enquiry form के ज़रिए भेजें। लाइव बैकएंड कॉन्फ़िगर होने पर आपकी जानकारी सुरक्षित रूप से सेव होगी।",
    formName: "आपका नाम",
    formEmail: "ईमेल पता",
    formPhone: "फोन / WhatsApp",
    formService: "आपको कौन-सी सेवा चाहिए?",
    formChoose: "सेवा चुनें",
    formDate: "कार्यक्रम की तारीख (वैकल्पिक)",
    formBudget: "बजट सीमा (वैकल्पिक)",
    formMessage: "अपने प्रोजेक्ट के बारे में बताएँ",
    formSubmit: "Enquiry भेजें",
    formSending: "भेज रहे हैं…",
    formHeading: "प्रोजेक्ट की पूछताछ",
    formConnected: "सुरक्षित सबमिशन",
    formNotice: "आपकी enquiry मिल गई है। हम आपसे संपर्क करेंगे।",
    formError: "Enquiry नहीं भेजी जा सकी। कृपया फिर कोशिश करें या दूसरे तरीके से संपर्क करें।",
    formRequiredContact: "कृपया ईमेल पता या फोन नंबर दर्ज करें।",
    consentRequired: "कृपया पुष्टि करें कि हम आपकी enquiry का जवाब देने के लिए इन विवरणों का उपयोग कर सकते हैं।",
    consentLabel: "मैं सहमत हूँ कि Golden Films मेरी enquiry का जवाब देने के लिए ऊपर दिए गए विवरणों का उपयोग कर सकता है।",
    contactDetails: "सुनील के फोन, WhatsApp, ईमेल और Instagram विवरण वेबसाइट लाइव होने से पहले जोड़े जाएँगे।",
    footerLine: "पलों को सँजोना। यादें बनाना।",
    quickLinks: "लिंक",
    services: "सेवाएँ",
    contact: "संपर्क",
    demoLabel: "डेमो इमेज",
    allRights: "सभी नमूना प्रोजेक्ट और तस्वीरें केवल प्रदर्शन के लिए हैं।"
  }
} as const;

const groupForFilter: Array<PortfolioGroup | "all"> = ["all", "photography", "videography", "editing"];
const services = [
  { id: "photography", icon: Camera, title: { en: "Photography", hi: "फोटोग्राफी" }, detail: { en: "Weddings, pre-weddings, portraits, events, fashion and products.", hi: "शादी, प्री-वेडिंग, पोर्ट्रेट, इवेंट, फैशन और प्रोडक्ट शूट।" } },
  { id: "videography", icon: Film, title: { en: "Videography", hi: "वीडियोग्राफी" }, detail: { en: "Cinematic wedding films, events, travel and brand stories.", hi: "सिनेमैटिक वेडिंग फिल्में, इवेंट, ट्रैवल और ब्रांड स्टोरीज़।" } },
  { id: "photo-editing", icon: WandSparkles, title: { en: "Photo editing", hi: "फोटो एडिटिंग" }, detail: { en: "Retouching, color correction and creative finishing.", hi: "रीटचिंग, कलर करेक्शन और क्रिएटिव फिनिशिंग।" } },
  { id: "video-editing", icon: Clapperboard, title: { en: "Video editing", hi: "वीडियो एडिटिंग" }, detail: { en: "Cinematic cuts, color grading, reels and short-form edits.", hi: "सिनेमैटिक कट्स, कलर ग्रेडिंग, रील्स और शॉर्ट एडिट्स।" } }
];
const filterKeys = ["all", "photography", "videography", "editing"] as const;

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [activeFilter, setActiveFilter] = useState<PortfolioGroup | "all">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error" | "contact-required">("idle");
  const t = copy[language];
  const filteredCategories = useMemo(
    () => activeFilter === "all" ? categories : categories.filter((item) => item.group === activeFilter),
    [activeFilter]
  );

  const handleEnquirySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formStatus === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!data.get("email")?.toString().trim() && !data.get("phone")?.toString().trim()) {
      setFormStatus("contact-required");
      return;
    }
    setFormStatus("sending");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          service: data.get("service"),
          eventDate: data.get("date"),
          budgetRange: data.get("budget"),
          message: data.get("message"),
          website: data.get("website"),
          consent: data.get("consent") === "on",
        }),
      });
      if (!response.ok) throw new Error("Enquiry API request failed");
      form.reset();
      setFormStatus("success");
    } catch {
      setFormStatus("error");
    }
  };

  const jumpToCategories = (filter: PortfolioGroup | "all" = "all") => {
    setActiveFilter(filter);
    setMenuOpen(false);
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="site-shell">
      <div className="demo-banner"><Sparkles size={14} /> {t.sampleNotice}</div>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Golden Films home">
          <span className="brand-mark"><Aperture size={28} strokeWidth={1.6} /></span>
          <span className="brand-copy"><strong>GOLDEN <em>FILMS</em></strong><small>PHOTOGRAPHY · FILMS · EDITING</small></span>
        </a>
        <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {t.nav.map((label, index) => {
            const routes = ["/", "/portfolio", "/services", "/about", "/showreel", "/contact"];
            return <a key={routes[index]} href={routes[index]} onClick={() => setMenuOpen(false)}>{label}</a>;
          })}
        </nav>
        <div className="header-actions">
          <div className="language-toggle" aria-label="Choose language">
            <Languages size={15} aria-hidden="true" />
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")} aria-pressed={language === "hi"}>हिंदी</button>
          </div>
          <a className="button button-gold header-cta" href="#contact">{t.contactSunil}<ArrowRight size={15} /></a>
        </div>
      </header>

      <main>
        <section className="hero section-wrap" id="home">
          <div className="hero-copy">
            <p className="eyebrow"><span />{t.eyebrow}</p>
            <h1>{t.heroTitle}</h1>
            <p className="hero-services">Photography <b>·</b> Videography <b>·</b> Photo Editing <b>·</b> Video Editing</p>
            <p className="hero-description">{t.heroText}</p>
            <div className="hero-buttons">
              <a className="button button-gold" href="#categories">{t.viewPortfolio}<ArrowDownRight size={17} /></a>
              <a className="button button-outline" href="#contact"><MessageCircle size={16} />{t.contactSunil}</a>
            </div>
            <div className="hero-facts">
              <div><strong>14</strong><span>{language === "en" ? "Portfolio categories" : "पोर्टफोलियो कैटेगरी"}</span></div>
              <div><strong>04</strong><span>{language === "en" ? "Core creative services" : "मुख्य क्रिएटिव सेवाएँ"}</span></div>
              <div><strong>EN <i>·</i> हिं</strong><span>{language === "en" ? "Bilingual experience" : "दो भाषाओं में वेबसाइट"}</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <img src={heroImage} alt={language === "en" ? "Wedding celebration — demo portfolio image" : "शादी समारोह — डेमो पोर्टफोलियो इमेज"} fetchPriority="high" />
            <div className="hero-image-shade" />
            <div className="hero-image-note"><span>{t.demo}</span><small>{language === "en" ? "Sample wedding story" : "शादी की नमूना कहानी"}</small></div>
            <div className="hero-image-index">01 <span>/</span> 14</div>
          </div>
          <div className="hero-bottom-line"><span /> {language === "en" ? "Visual stories for moments that matter" : "खास पलों के लिए विजुअल कहानियाँ"} <ArrowRight size={14} /></div>
        </section>

        <section className="service-strip section-wrap" aria-label="Creative services">
          {services.map(({ id, icon: Icon, title, detail }) => (
            <button className="service-strip-item" key={id} type="button" onClick={() => jumpToCategories(id === "photo-editing" ? "editing" : id === "video-editing" ? "editing" : id as PortfolioGroup)}>
              <span className="service-icon"><Icon size={22} strokeWidth={1.6} /></span>
              <span><strong>{title[language]}</strong><small>{detail[language]}</small></span>
              <ArrowRight className="strip-arrow" size={15} />
            </button>
          ))}
        </section>

        <section className="section-block section-wrap" id="categories">
          <div className="section-heading">
            <div><p className="eyebrow">{t.categoriesEyebrow}</p><h2>{t.categoriesTitle}</h2><p className="section-subtitle">{t.categoriesText}</p></div>
            <a href="#featured" className="text-link">{language === "en" ? "View featured work" : "फीचर्ड काम देखें"} <ArrowRight size={16} /></a>
          </div>
          <div className="filter-row" role="group" aria-label="Filter portfolio categories">
            {filterKeys.map((key, index) => <button key={key} type="button" className={activeFilter === key ? "filter-chip active" : "filter-chip"} aria-pressed={activeFilter === key} onClick={() => setActiveFilter(groupForFilter[index])}>{t.filters[index]}</button>)}
          </div>
          <div className="category-grid">
            {filteredCategories.map((category, index) => (
              <article className="category-card" key={category.id} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <a href="#featured" className="category-image" onClick={() => setActiveFilter(category.group)} aria-label={category.title[language]}>
                  <img src={category.image} alt={category.imageAlt[language]} loading="lazy" />
                  <span className="image-vignette" />
                  <span className="demo-tag">{t.demo}</span>
                  <span className="category-number">{String(categories.findIndex((item) => item.id === category.id) + 1).padStart(2, "0")}</span>
                  <span className="category-open"><ArrowDownRight size={17} /></span>
                </a>
                <div className="category-card-copy"><h3>{category.title[language]}</h3><p>{category.group === "photography" ? (language === "en" ? "Photography" : "फोटोग्राफी") : category.group === "videography" ? (language === "en" ? "Films & motion" : "फिल्में और वीडियो") : (language === "en" ? "Creative editing" : "क्रिएटिव एडिटिंग")}</p></div>
              </article>
            ))}
          </div>
          <div className="categories-footnote"><ImageIcon size={15} /> {language === "en" ? "All imagery in this preview is sample content and can be replaced in the future admin panel." : "इस प्रीव्यू की सभी तस्वीरें नमूना सामग्री हैं; भविष्य में Admin Panel से इन्हें बदला जा सकेगा।"}</div>
        </section>

        <section className="featured-section section-wrap" id="featured">
          <div className="section-heading">
            <div><p className="eyebrow">{t.featuredEyebrow}</p><h2>{t.featuredTitle}</h2><p className="section-subtitle">{t.featuredText}</p></div>
            <button type="button" className="text-link text-button" onClick={() => jumpToCategories("all")}>{language === "en" ? "Browse all categories" : "सभी कैटेगरी देखें"} <ArrowRight size={16} /></button>
          </div>
          <div className="featured-grid">
            {projects.filter((project) => project.featured).map((project, index) => (
              <article className={`project-card project-card-${index + 1}`} key={project.id}>
                <div className="project-image">
                  <img src={project.image} alt={project.imageAlt[language]} loading="lazy" />
                  <div className="project-image-overlay" />
                  <span className="demo-tag">{t.demo}</span>
                  <span className="project-index">0{index + 1}</span>
                </div>
                <div className="project-card-copy"><p>{project.category[language]}</p><h3>{project.title[language]}</h3><span>{t.previewOnly}</span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="services-section section-wrap" id="services">
          <div className="section-heading">
            <div><p className="eyebrow">{t.servicesEyebrow}</p><h2>{t.servicesTitle}</h2><p className="section-subtitle">{t.servicesText}</p></div>
          </div>
          <div className="services-grid">
            {services.map(({ id, icon: Icon, title, detail }, index) => (
              <button type="button" className="service-card" key={id} onClick={() => jumpToCategories(id.includes("editing") ? "editing" : id as PortfolioGroup)}>
                <span className="service-card-top"><span className="service-icon large"><Icon size={25} strokeWidth={1.5} /></span><span className="service-card-number">0{index + 1}</span></span>
                <h3>{title[language]}</h3><p>{detail[language]}</p><span className="service-card-link">{t.learnMore}<ArrowRight size={15} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="about-section section-wrap" id="about">
          <div className="about-visual">
            <img src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1100&q=82" alt={language === "en" ? "Photographer at work — demo image" : "काम करते फोटोग्राफर — डेमो इमेज"} loading="lazy" />
            <span className="about-stamp"><Aperture size={22} /><span>GOLDEN<br />FILMS</span></span>
            <p className="about-caption">{t.aboutPlaceholder}</p>
          </div>
          <div className="about-copy">
            <p className="eyebrow">{t.aboutEyebrow}</p><h2>{t.aboutTitle}</h2><p>{t.aboutText}</p>
            <div className="about-signature"><span className="signature-mark">S.</span><span><strong>Sunil</strong><small>{language === "en" ? "Photographer · Videographer · Editor" : "फोटोग्राफर · वीडियोग्राफर · एडिटर"}</small></span></div>
            <button type="button" className="button button-outline" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>{t.contactSunil}<ArrowRight size={16} /></button>
          </div>
        </section>

        <section className="showreel-section section-wrap" id="showreel">
          <div className="section-heading">
            <div><p className="eyebrow">{t.showreelEyebrow}</p><h2>{t.showreelTitle}</h2><p className="section-subtitle">{t.showreelText}</p></div>
          </div>
          <div className="showreel-grid">
            {projects.filter((project) => project.group === "videography" || project.group === "editing").slice(0, 3).map((project, index) => (
              <article className="showreel-card" key={project.id}>
                <div className="showreel-image"><img src={project.image} alt={project.imageAlt[language]} loading="lazy" /><span className="demo-tag">{t.demo}</span><span className="play-button" aria-hidden="true"><Play size={18} fill="currentColor" /></span><span className="showreel-duration">0{index + 1} · DEMO</span></div>
                <h3>{project.title[language]}</h3><p>{project.category[language]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="contact-section section-wrap" id="contact">
          <div className="contact-copy">
            <p className="eyebrow">{t.contactEyebrow}</p><h2>{t.contactTitle}</h2><p>{t.contactText}</p>
            <div className="contact-info-card"><span className="contact-info-icon"><MessageCircle size={21} /></span><div><strong>{language === "en" ? "Contact details" : "संपर्क विवरण"}</strong><p>{t.contactDetails}</p></div></div>
            <div className="contact-methods"><span><Check size={14} /> WhatsApp</span><span><Check size={14} /> Phone</span><span><Check size={14} /> Email</span><span><Check size={14} /> Instagram</span></div>
          </div>
          <form className="enquiry-form" onSubmit={handleEnquirySubmit}>
            <div className="form-heading"><span className="eyebrow">{t.formHeading}</span><span className="form-preview-pill">{t.formConnected}</span></div>
            <label aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
            <div className="form-grid">
              <label>{t.formName}<input name="name" placeholder={language === "en" ? "Your full name" : "आपका पूरा नाम"} required /></label>
              <label>{t.formEmail}<input name="email" type="email" placeholder="you@example.com" /></label>
              <label>{t.formPhone}<input name="phone" type="tel" placeholder="+91 ..." /></label>
              <label>{t.formService}<select name="service" defaultValue="" required><option value="" disabled>{t.formChoose}</option>{services.map((item) => <option key={item.id} value={item.id}>{item.title[language]}</option>)}</select></label>
              <label>{t.formDate}<input name="date" type="date" /></label>
              <label>{t.formBudget}<select name="budget" defaultValue=""><option value="">{language === "en" ? "Select range" : "सीमा चुनें"}</option><option value="undecided">{language === "en" ? "To be discussed" : "बातचीत के अनुसार"}</option><option value="small">{language === "en" ? "Budget-friendly" : "कम बजट"}</option><option value="custom">{language === "en" ? "Custom project" : "कस्टम प्रोजेक्ट"}</option></select></label>
              <label className="form-full">{t.formMessage}<textarea name="message" rows={4} placeholder={language === "en" ? "Share the details you already know..." : "जो जानकारी उपलब्ध है, वह लिखें..."} required /></label>
              <label className="consent-check form-full"><input name="consent" type="checkbox" required /><span>{t.consentLabel}</span></label>
            </div>
            <button className="button button-gold form-submit" type="submit" disabled={formStatus === "sending"}>{formStatus === "sending" ? t.formSending : t.formSubmit}<Send size={16} /></button>
            {formStatus === "success" && <p className="form-notice" role="status">{t.formNotice}</p>}
            {formStatus === "contact-required" && <p className="form-notice" role="alert">{t.formRequiredContact}</p>}
            {formStatus === "error" && <p className="form-notice" role="alert">{t.formError}</p>}
          </form>
        </section>
      </main>

      <footer className="site-footer section-wrap">
        <div className="footer-brand"><a className="brand" href="#home"><span className="brand-mark"><Aperture size={25} /></span><span className="brand-copy"><strong>GOLDEN <em>FILMS</em></strong><small>PHOTOGRAPHY · FILMS · EDITING</small></span></a><p>{t.footerLine}</p><span className="footer-demo"><Sparkles size={13} /> {t.demo}</span></div>
        <div className="footer-column"><h3>{t.quickLinks}</h3><a href="#home">{t.nav[0]}</a><a href="#categories">{t.nav[1]}</a><a href="#featured">{t.featuredTitle}</a><a href="#about">{t.nav[3]}</a></div>
        <div className="footer-column"><h3>{t.services}</h3>{services.map((item) => <button type="button" key={item.id} onClick={() => jumpToCategories(item.id.includes("editing") ? "editing" : item.id as PortfolioGroup)}>{item.title[language]}</button>)}</div>
        <div className="footer-column"><h3>{t.contact}</h3><a href="#contact">{t.contactSunil}</a><a href="#contact">WhatsApp · Phone</a><a href="#contact">Email · Instagram</a><span className="footer-muted">{language === "en" ? "Official details will be added before launch." : "लाइव करने से पहले असली विवरण जोड़े जाएँगे।"}</span></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Golden Films</span><span>{t.allRights}</span><a href="#home">Back to top ↑</a></div>
      </footer>
    </div>
  );
}

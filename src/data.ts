export type Language = "en" | "hi";
export type PortfolioGroup = "photography" | "videography" | "editing";

export interface PortfolioCategory {
  id: string;
  group: PortfolioGroup;
  title: { en: string; hi: string };
  image: string;
  imageAlt: { en: string; hi: string };
}

export interface DemoProject {
  id: string;
  title: { en: string; hi: string };
  category: { en: string; hi: string };
  group: PortfolioGroup;
  image: string;
  imageAlt: { en: string; hi: string };
  featured?: boolean;
}

const unsplash = (photoId: string, width = 900) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=82`;

// Temporary visual assets from Unsplash are samples only, not Sunil's own work.
// Replace with approved portfolio images before representing any work as real.
export const categories: PortfolioCategory[] = [
  { id: "wedding", group: "photography", title: { en: "Wedding Photography", hi: "वेडिंग फोटोग्राफी" }, image: unsplash("photo-1519741497674-611481863552", 720), imageAlt: { en: "Wedding celebration detail — demo image", hi: "शादी समारोह की झलक — डेमो इमेज" } },
  { id: "pre-wedding", group: "photography", title: { en: "Pre-Wedding Photography", hi: "प्री-वेडिंग फोटोग्राफी" }, image: unsplash("photo-1511285560929-80b456fea0bc", 720), imageAlt: { en: "Couple portrait at a celebration — demo image", hi: "समारोह में कपल पोर्ट्रेट — डेमो इमेज" } },
  { id: "portrait", group: "photography", title: { en: "Portrait & Personal", hi: "पोर्ट्रेट और पर्सनल" }, image: unsplash("photo-1500648767791-00dcc994a43e", 720), imageAlt: { en: "Studio-style portrait — demo image", hi: "पोर्ट्रेट फोटो — डेमो इमेज" } },
  { id: "fashion", group: "photography", title: { en: "Fashion & Model", hi: "फैशन और मॉडल" }, image: unsplash("photo-1529139574466-a303027c1d8b", 720), imageAlt: { en: "Fashion editorial look — demo image", hi: "फैशन एडिटोरियल — डेमो इमेज" } },
  { id: "events", group: "photography", title: { en: "Event Photography", hi: "इवेंट फोटोग्राफी" }, image: unsplash("photo-1506157786151-b8491531f063", 720), imageAlt: { en: "Live event lighting — demo image", hi: "लाइव इवेंट लाइटिंग — डेमो इमेज" } },
  { id: "product", group: "photography", title: { en: "Product Photography", hi: "प्रोडक्ट फोटोग्राफी" }, image: unsplash("photo-1523275335684-37898b6baf30", 720), imageAlt: { en: "Product watch photograph — demo image", hi: "प्रोडक्ट वॉच फोटो — डेमो इमेज" } },
  { id: "commercial", group: "photography", title: { en: "Commercial Photography", hi: "कमर्शियल फोटोग्राफी" }, image: unsplash("photo-1486406146926-c627a92ad1ab", 720), imageAlt: { en: "Modern commercial architecture — demo image", hi: "आधुनिक कमर्शियल आर्किटेक्चर — डेमो इमेज" } },
  { id: "wedding-films", group: "videography", title: { en: "Cinematic Wedding Films", hi: "सिनेमैटिक वेडिंग फिल्म्स" }, image: unsplash("photo-1492691527719-9d1e07e534b4", 720), imageAlt: { en: "Filmmaker holding a camera — demo image", hi: "कैमरा लिए फिल्ममेकर — डेमो इमेज" } },
  { id: "event-video", group: "videography", title: { en: "Event Videography", hi: "इवेंट वीडियोग्राफी" }, image: unsplash("photo-1492684223066-81342ee5ff30", 720), imageAlt: { en: "Stage lights at a live event — demo image", hi: "लाइव इवेंट की स्टेज लाइट्स — डेमो इमेज" } },
  { id: "brand-films", group: "videography", title: { en: "Promotional & Brand Films", hi: "प्रमोशनल और ब्रांड फिल्म्स" }, image: unsplash("photo-1497366811353-6870744d04b2", 720), imageAlt: { en: "Modern creative workspace — demo image", hi: "मॉडर्न क्रिएटिव वर्कस्पेस — डेमो इमेज" } },
  { id: "photo-editing", group: "editing", title: { en: "Photo Editing & Retouching", hi: "फोटो एडिटिंग और रीटचिंग" }, image: unsplash("photo-1452587925148-ce544e77e70d", 720), imageAlt: { en: "Photographer working with a camera — demo image", hi: "कैमरे के साथ फोटोग्राफर — डेमो इमेज" } },
  { id: "video-editing", group: "editing", title: { en: "Video Editing & Color Grading", hi: "वीडियो एडिटिंग और कलर ग्रेडिंग" }, image: unsplash("photo-1574717024653-61fd2cf4d44d", 720), imageAlt: { en: "Video production workspace — demo image", hi: "वीडियो प्रोडक्शन वर्कस्पेस — डेमो इमेज" } },
  { id: "reels", group: "videography", title: { en: "Reels & Short-Form Videos", hi: "रील्स और शॉर्ट वीडियो" }, image: unsplash("photo-1536240478700-b869070f9279", 720), imageAlt: { en: "Cinema and video production equipment — demo image", hi: "सिनेमा और वीडियो उपकरण — डेमो इमेज" } },
  { id: "other", group: "videography", title: { en: "Travel & Other Projects", hi: "ट्रैवल और अन्य प्रोजेक्ट्स" }, image: unsplash("photo-1470770841072-f978cf4d019e", 720), imageAlt: { en: "Mountain lake landscape — demo image", hi: "पहाड़ी झील का दृश्य — डेमो इमेज" } }
];

export const projects: DemoProject[] = [
  { id: "royal-wedding", group: "photography", title: { en: "A Celebration in Gold", hi: "सुनहरी यादों का जश्न" }, category: { en: "Wedding Photography", hi: "वेडिंग फोटोग्राफी" }, image: unsplash("photo-1519741497674-611481863552", 1100), imageAlt: { en: "Wedding details — demo portfolio image", hi: "शादी की झलक — डेमो पोर्टफोलियो इमेज" }, featured: true },
  { id: "together-always", group: "photography", title: { en: "Together, Always", hi: "हमेशा साथ" }, category: { en: "Pre-Wedding Photography", hi: "प्री-वेडिंग फोटोग्राफी" }, image: unsplash("photo-1511285560929-80b456fea0bc", 1100), imageAlt: { en: "Couple story — demo portfolio image", hi: "कपल स्टोरी — डेमो पोर्टफोलियो इमेज" }, featured: true },
  { id: "portrait-light", group: "photography", title: { en: "Portraits in Natural Light", hi: "प्राकृतिक रोशनी में पोर्ट्रेट" }, category: { en: "Portrait & Personal", hi: "पोर्ट्रेट और पर्सनल" }, image: unsplash("photo-1534528741775-53994a69daeb", 1100), imageAlt: { en: "Portrait in soft light — demo portfolio image", hi: "सॉफ्ट लाइट में पोर्ट्रेट — डेमो पोर्टफोलियो इमेज" }, featured: true },
  { id: "product-detail", group: "photography", title: { en: "Details That Matter", hi: "बारीकियों की खूबसूरती" }, category: { en: "Product Photography", hi: "प्रोडक्ट फोटोग्राफी" }, image: unsplash("photo-1523275335684-37898b6baf30", 1100), imageAlt: { en: "Minimal product shot — demo portfolio image", hi: "मिनिमल प्रोडक्ट फोटो — डेमो पोर्टफोलियो इमेज" }, featured: true },
  { id: "live-moments", group: "videography", title: { en: "Moments in Motion", hi: "चलते पलों की कहानी" }, category: { en: "Cinematic Wedding Films", hi: "सिनेमैटिक वेडिंग फिल्म्स" }, image: unsplash("photo-1492684223066-81342ee5ff30", 1100), imageAlt: { en: "Event atmosphere — demo video thumbnail", hi: "इवेंट का माहौल — डेमो वीडियो थंबनेल" }, featured: true },
  { id: "creative-cut", group: "editing", title: { en: "The Final Cut", hi: "फाइनल कट" }, category: { en: "Video Editing & Color Grading", hi: "वीडियो एडिटिंग और कलर ग्रेडिंग" }, image: unsplash("photo-1574717024653-61fd2cf4d44d", 1100), imageAlt: { en: "Editing workspace — demo portfolio image", hi: "एडिटिंग वर्कस्पेस — डेमो पोर्टफोलियो इमेज" }, featured: true }
];

export const heroImage = unsplash("photo-1537633552985-df8429e8048b", 1800);

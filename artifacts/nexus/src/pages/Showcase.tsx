import { ArrowLeft, ExternalLink, Sparkles, Monitor, Code2, Rocket, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';

export interface ShowcaseProject {
  id: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  url: string;
  tags: string[];
}

export const SHOCASE_PROJECTS: ShowcaseProject[] = [
  {
    id: 'sleep-flow-imaginative',
    title: 'Sleep Flow Imaginative',
    shortDesc: 'A premium animated visual artwork exploring the sleep realm.',
    longDesc: "A premium animated visual artwork, expressing a creative artist's mind looking at the sleep realm. It serves as an educational and visually complex piece expressing the importance of sleep through code as art.",
    url: 'https://sleepdream.vercel.app/',
    tags: ['WebGL', 'Animation', 'Premium UI', 'React'],
  },
  {
    id: 'davala-ecommerce',
    title: 'Davala',
    shortDesc: 'A premium full-stack e-commerce platform for female beauty, health, and hygiene products.',
    longDesc: 'A highly sophisticated full-stack e-commerce experience tailored exclusively for female beauty, health, and hygiene. It features seamless front-end and back-end integration, robust inventory and customer management, automated invoice generation, complete order fulfillment logic, and a secure premium admin panel for full operational control.',
    url: 'https://davala.xyz/',
    tags: ['Full-Stack', 'E-commerce', 'Admin Panel', 'Premium UI'],
  },
  {
    id: 'fafs-global',
    title: 'FAFS Global',
    shortDesc: 'A premium full-stack enterprise website with a fully integrated drag-and-drop website builder and admin dashboard.',
    longDesc: 'A robust enterprise platform offering complete data management and a deeply integrated drag-and-drop website builder natively within the admin panel. Users with zero coding knowledge can seamlessly edit text, headings, layouts, images, and media using intuitive visual controls and pre-set layouts, empowering full control over the entire website experience.',
    url: 'https://fafsglobal.lovable.app/',
    tags: ['Website Builder', 'Drag & Drop', 'Admin Dashboard', 'Enterprise'],
  },
  {
    id: 'az-hero-portal',
    title: 'AZ Hero Portal',
    shortDesc: 'A full-stack superhero-themed premium newsletter, news, and reviews platform.',
    longDesc: 'A high-octane superhero-themed premium newsletter and review portal. It features complete full-stack frontend and backend integration, delivering curated news, top 10 lists, and interactive reviews tailored for the ultimate comic and movie fans with an engaging premium UI architecture.',
    url: 'https://azheroportal.web.app/',
    tags: ['Full-Stack', 'News & Reviews', 'Premium UI', 'Web App'],
  },
  {
    id: 'premium-news-portal',
    title: 'TruthLens Premium E-News Portal',
    shortDesc: 'A full-stack premium online news and editorial management system with a robust admin panel.',
    longDesc: 'A next-generation premium e-news portal equipped with a fully-fledged admin panel management system. It allows anyone, regardless of technical knowledge, to effortlessly manage news, editorials, and every site feature. Loaded with premium functionalities that outshine even paid online news platforms.',
    url: 'https://truthlens-five.vercel.app/',
    tags: ['Full-Stack', 'News Portal', 'Admin Panel', 'Editorial'],
  },
  {
    id: 'aimhigh-sigma',
    title: 'AIM High Sigma',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aimhigh-sigma.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'aimcentre-demo',
    title: 'AIM Centre Demo',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aimcentredemo.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'aim-centre-360',
    title: 'AIM Centre 360 - Edition 1',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aim-centre-360.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'aimcentre-360-variant',
    title: 'AIM Centre 360 - Edition 2',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aimcentre-360.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'aim-centre360',
    title: 'AIM Centre 360 - Edition 3',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aim-centre360.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'aimcentrevibe',
    title: 'AIM Centre Vibe',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://aimcentrevibe.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'drmoniazaman',
    title: 'Dr. Monia Zaman - AIM Centre',
    shortDesc: 'A premium animated e-learning and full LMS ed-tech platform featuring varying international designs.',
    longDesc: 'A premium animated e-learning online school and course-selling full LMS ed-tech platform. Designed as part of an extensive suite of over 17 premium variations for an international Australia-based ed-tech platform, featuring highly sophisticated, responsive, and animated frontends tailored for different learning demographics.',
    url: 'https://drmoniazaman.vercel.app/',
    tags: ['Ed-Tech', 'LMS', 'E-Learning', 'React', 'Premium UI'],
  },
  {
    id: 'hurtfeelings',
    title: 'Hurtfeelings',
    shortDesc: 'A premium animated landing page featuring complex interactive visuals and smooth scroll experiences.',
    longDesc: 'A highly sophisticated and premium animated landing page that showcases complex interactive visual elements, smooth scroll-driven animations, and a deeply engaging user experience. Designed with a focus on visual storytelling and high-end frontend architecture.',
    url: 'https://hurt-feelings.vercel.app/',
    tags: ['Animation', 'Landing Page', 'Premium UI', 'React'],
  }
];

export default function Showcase() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/30">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl glass hover:bg-secondary/50 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Premium Showcase
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                  Websites & Apps We've Built
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-20">
          
          {/* Intro */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-4">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-xs font-bold text-primary tracking-wide text-primary">OUR PORTFOLIO</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Crafting Digital
              <br className="sm:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(245,60%,55%)] to-[hsl(199,80%,50%)]">Masterpieces.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              We don't just write code; we build art. Explore our curated selection of high-end websites, SaaS platforms, and interactive experiences. Every pixel crafted with passion and precision.
            </p>
          </motion.div>

          <div className="space-y-16 sm:space-y-24">
            {SHOCASE_PROJECTS.map((project, index) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="group relative"
              >
                {/* Background Glow */}
                <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="relative glass rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-8 border border-border shadow-2xl overflow-hidden flex flex-col gap-6 sm:gap-8">
                  
                  {/* Title & Tags placed at top */}
                  <div className="space-y-4 z-10 text-center sm:text-left">
                    <h3 className="text-3xl sm:text-5xl font-black tracking-tight">{project.title}</h3>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                      {project.shortDesc}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                      {project.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-secondary/80 border border-border text-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* iFrame Browser Preview Section - MASSIVE FULL WIDTH */}
                  <div className="relative z-10 w-full rounded-2xl sm:rounded-[2rem] overflow-hidden border border-border/60 bg-black shadow-2xl transition-colors duration-500">
                    {/* Browser Chrome Header - slimmed down */}
                    <div className="h-5 sm:h-7 bg-secondary/80 backdrop-blur-md flex items-center px-3 sm:px-4 gap-2 border-b border-white/10 relative z-20">
                       <div className="flex gap-1.5 opacity-80">
                         <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400" />
                         <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400" />
                         <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400" />
                       </div>
                       <div className="mx-auto px-2 sm:px-4 py-[1px] rounded flex-1 max-w-[120px] sm:max-w-[180px] text-center bg-background/50 border border-white/5 text-[7px] sm:text-[9px] text-muted-foreground truncate overflow-hidden">
                          {project.url.replace(/^https?:\/\//, '')}
                       </div>
                    </div>
                    {/* iFrame Container - 16:9 aspect ratio simulated desktop */}
                    <div className="w-full aspect-video relative bg-background overflow-hidden rounded-b-2xl sm:rounded-b-[2rem]">
                       {/* Loading Placeholder */}
                       <div className="absolute inset-0 flex items-center justify-center bg-background z-0">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                       </div>
                       {/* Scaled iframe wrapper for perfect desktop 1280x720 capture effect */}
                       <div 
                         className="absolute top-0 left-0 z-10"
                         style={{ 
                            width: '300%', 
                            height: '300%', 
                            transform: 'scale(0.333333)', 
                            transformOrigin: 'top left' 
                         }}
                       >
                          <iframe 
                            src={project.url} 
                            title={`${project.title} Preview`}
                            className="w-full h-full border-none bg-background pointer-events-none group-hover:pointer-events-auto"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin"
                          />
                       </div>
                       {/* Interaction overlay */}
                       <div className="absolute inset-0 z-20 flex items-center justify-center transition-all duration-700 bg-black/40 backdrop-blur-md group-hover:opacity-0 group-hover:backdrop-blur-none pointer-events-none">
                          <div className="px-6 py-3 bg-background/95 text-foreground font-bold text-xs sm:text-sm rounded-full shadow-2xl border border-white/20 flex items-center gap-2 transform transition-all duration-700 group-hover:scale-90 group-hover:translate-y-4">
                             <Monitor className="w-4 h-4 text-primary" /> 
                             <span className="hidden sm:inline">Hover to interact</span>
                             <span className="sm:hidden">Tap to interact</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Long Description Card & CTA located below the preview */}
                  <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 z-10 pt-2">
                    {/* Description Card */}
                    <div className="flex-[1.5] text-sm sm:text-base text-muted-foreground/90 leading-relaxed bg-background/40 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-border/50 shadow-inner flex items-center">
                      <p className="italic"> "{project.longDesc}" </p>
                    </div>

                    {/* Stats & CTA */}
                    <div className="flex-1 space-y-5 sm:space-y-6 flex flex-col justify-center">
                      <a 
                        href={project.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/25 transition-all hover:-translate-y-1 active:scale-95 text-sm sm:text-base w-full"
                      >
                        <ExternalLink className="w-5 h-5" /> Visit Live Masterpiece
                      </a>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                         <div className="flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Ultra Fast Load</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-blue-500" />
                            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Clean Code</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-purple-500" />
                            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Fully Responsive</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-pink-500" />
                            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Premium Visuals</span>
                         </div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Bottom CTA for hiring */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 glass rounded-[2rem] p-8 sm:p-12 text-center border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden"
          >
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full" />
             <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full" />
             
             <div className="relative z-10 space-y-6 max-w-xl mx-auto">
               <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Need a Website or App?</h3>
               <p className="text-sm text-muted-foreground leading-relaxed">
                 We handle everything from UI/UX design to full-stack development and deployment. Let's build your next big idea together.
               </p>
               <div className="bg-background/80 p-4 rounded-xl border border-border inline-block">
                 <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Contact Us</p>
                 <a href="mailto:hridoyzaman1@gmail.com" className="text-lg sm:text-xl font-bold text-primary hover:underline">
                    hridoyzaman1@gmail.com
                 </a>
                 <div className="mt-2 text-sm font-semibold flex items-center justify-center gap-2">
                   <span>WhatsApp:</span>
                   <a href="https://wa.me/8801947062892" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors hover:underline">
                       +8801947062892
                     </a>
                 </div>
               </div>
             </div>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  );
}

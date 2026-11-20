import { useEffect, useState, type MouseEventHandler } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  House,
  Menu,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";
import { apiRequest, type Account } from "./api";
import type { AppPage } from "./navigation";
import { readAppPage } from "./navigation";
import AuthenticatedPage from "./components/AuthenticatedPage";
import AuthDialog from "./components/AuthDialog";
import { KitchenIllustration, RepairIllustration } from "./components/HomeMaintainArt";

type AuthMode = "login" | "register";

const serviceCards = [
  {
    icon: BookOpen,
    category: "DO IT YOURSELF",
    title: "Learn what you can do",
    description:
      "Understand a household issue and explore a practical, safety-minded next step.",
    note: "Repair guides are coming soon",
    art: "service-art-guide",
  },
  {
    icon: Wrench,
    category: "TOOLS & EQUIPMENT",
    title: "Get the right equipment",
    description:
      "Find a clear path from the job you have to the tools that can help.",
    note: "Browse equipment rentals",
    art: "service-art-tools",
  },
  {
    icon: UserRoundCheck,
    category: "LOCAL PROFESSIONALS",
    title: "Bring in a professional",
    description:
      "Post a job, review technician applications, and agree on an intervention time.",
    note: "Available through the job workspace",
    art: "service-art-technician",
  },
];

const repairSteps = [
  {
    number: "01",
    title: "Describe what is happening",
    description:
      "Share the details and location so the right service can be selected.",
    example: "A few clear details make the next step easier.",
  },
  {
    number: "02",
    title: "Choose a way forward",
    description:
      "Explore a repair path or publish an open job for local technicians.",
    example: "DIY guidance · Equipment rental · Technician",
  },
  {
    number: "03",
    title: "Make a plan together",
    description:
      "Review proposals, reserve a time, and keep the job details together.",
    example: "Morning: 8–12 · Afternoon: 1–5",
  },
];

function Brand({
  href = "#home",
  onClick,
}: {
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a
      className="brand"
      href={href}
      aria-label="HomeMaintain home"
      onClick={onClick}
    >
      <span className="brand-mark">
        <House size={21} strokeWidth={1.8} />
      </span>
      <span>HomeMaintain</span>
    </a>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("homemaintain-token"),
  );
  const [user, setUser] = useState<Account | null>(null);
  const [technicianProfileAccess, setTechnicianProfileAccess] = useState<
    "loading" | "active" | "inactive"
  >(token ? "loading" : "inactive");
  const [authPending, setAuthPending] = useState(Boolean(token));
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [currentPage, setCurrentPage] = useState<AppPage>(() => readAppPage());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navigate = (page: AppPage, replace = false) => {
    const nextHash = `#${page}`;
    if (window.location.hash !== nextHash) {
      if (replace) {
        window.history.replaceState(null, "", nextHash);
      } else {
        window.history.pushState(null, "", nextHash);
      }
    }
    setCurrentPage(page);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const syncPage = () => {
      const requestedPage = readAppPage();
      setCurrentPage(
        user && requestedPage === "home" ? "personal-space" : requestedPage,
      );
    };
    window.addEventListener("popstate", syncPage);
    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("hashchange", syncPage);
    };
  }, [user]);

  useEffect(() => {
    if (!token) {
      setAuthPending(false);
      setUser(null);
      return;
    }

    let active = true;
    setAuthPending(true);
    apiRequest<{ user: Account }>("/auth/me", token)
      .then(({ user: account }) => {
        if (active) {
          setUser(account);
          setAuthError("");
          const requestedPage = readAppPage();
          if (requestedPage === "home") {
            window.history.replaceState(null, "", "#personal-space");
            setCurrentPage("personal-space");
          } else if (
            (requestedPage === "find-pro" && account.role !== "homeowner")
          ) {
            window.history.replaceState(null, "", "#personal-space");
            setCurrentPage("personal-space");
          } else {
            setCurrentPage(requestedPage);
          }
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : "Could not load your account.",
          );
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setAuthPending(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user || user.role === "admin") {
      setTechnicianProfileAccess("inactive");
      return;
    }

    let active = true;
    setTechnicianProfileAccess("loading");
    apiRequest<{ data: { active: boolean } }>(
      "/technicians/me/profile",
      token,
    )
      .then(({ data }) => {
        if (active) {
          setTechnicianProfileAccess(data.active ? "active" : "inactive");
        }
      })
      .catch(() => {
        if (active) setTechnicianProfileAccess("inactive");
      });

    return () => {
      active = false;
    };
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (
      currentPage === "find-job" &&
      technicianProfileAccess === "inactive"
    ) {
      window.history.replaceState(null, "", "#personal-space");
      setCurrentPage("personal-space");
    }
  }, [currentPage, technicianProfileAccess]);

  const handleAuthenticated = (sessionToken: string, account: Account) => {
    sessionStorage.setItem("homemaintain-token", sessionToken);
    setToken(sessionToken);
    setUser(account);
    setTechnicianProfileAccess("loading");
    setAuthError("");
    setAuthMode(null);
    navigate("personal-space");
  };

  const signOut = () => {
    sessionStorage.removeItem("homemaintain-token");
    setToken(null);
    setUser(null);
    setTechnicianProfileAccess("inactive");
    setAuthError("");
    window.history.replaceState(null, "", "#home");
    setCurrentPage("home");
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const updateSessionToken = (sessionToken: string) => {
    sessionStorage.setItem("homemaintain-token", sessionToken);
    setToken(sessionToken);
  };

  const startRepair = () => {
    if (user) {
      navigate("my-repairs");
    } else {
      setAuthMode("register");
    }
  };

  const openRentals = () => {
    if (user) {
      navigate("rentals");
    } else {
      setAuthMode("login");
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const avatarText = user
    ? user.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "";

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand
            href={user ? "#personal-space" : "#home"}
            onClick={
              user
                ? (event) => {
                    event.preventDefault();
                    navigate("personal-space");
                  }
                : undefined
            }
          />
          <button
            className="icon-button mobile-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`main-nav ${mobileMenuOpen ? "is-open" : ""}`}>
            {user ? (
              <>
                <button onClick={() => navigate("personal-space")}>Overview</button>
                <button onClick={() => navigate("my-repairs")}>My repairs</button>
                {user.role === "homeowner" && (
                  <button onClick={() => navigate("find-pro")}>Find a pro</button>
                )}
                {technicianProfileAccess === "active" && (
                  <button onClick={() => navigate("find-job")}>Find a job</button>
                )}
                <button onClick={() => navigate("rentals")}>Rentals</button>
              </>
            ) : (
              <>
                <a href="#services" onClick={closeMobileMenu}>Services</a>
                <a href="#how-it-works" onClick={closeMobileMenu}>How it works</a>
                <a href="#about" onClick={closeMobileMenu}>About</a>
                <a href="#stories" onClick={closeMobileMenu}>Stories</a>
              </>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <div className="profile-menu-wrap">
                <button
                  className="profile-menu-trigger"
                  type="button"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  <span className="header-avatar">{avatarText}</span>
                  <span className="signed-in-name">{user.fullName}</span>
                  <ChevronDown size={15} />
                </button>
                {profileMenuOpen && (
                  <div className="profile-dropdown" role="menu">
                    <div className="profile-dropdown-user">
                      <span className="header-avatar">{avatarText}</span>
                      <span><strong>{user.fullName}</strong><small>{user.email}</small></span>
                    </div>
                    <button role="menuitem" onClick={() => navigate("profile")}>
                      <UserRoundCheck size={16} /> Profile management
                    </button>
                    <button role="menuitem" onClick={signOut}>
                      <ArrowRight size={16} className="sign-out-icon" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : authPending ? (
              <span className="signed-in-name">Checking session…</span>
            ) : (
              <>
                <button
                  className="text-button sign-in-button"
                  onClick={() => setAuthMode("login")}
                >
                  Sign in
                </button>
                <button
                  className="button button-primary button-small"
                  onClick={startRepair}
                >
                  Get started <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {user ? (
          <section className="section workspace-section app-page-section">
            <div className="page-container">
              <AuthenticatedPage
                page={currentPage}
                user={user}
                token={token ?? ""}
                hasActiveTechnicianProfile={technicianProfileAccess === "active"}
                onNavigate={navigate}
                onUserUpdate={setUser}
                onTokenUpdate={updateSessionToken}
                onTechnicianProfileStatusChange={(active) =>
                  setTechnicianProfileAccess(active ? "active" : "inactive")
                }
              />
            </div>
          </section>
        ) : authPending ? (
          <div className="session-loading" role="status">Checking your session…</div>
        ) : currentPage !== "home" ? (
          <section className="section workspace-section app-page-section">
            <div className="page-container">
              <div className="workspace-empty">
                <span className="eyebrow">Your HomeMaintain workspace</span>
                <h2>Sign in to continue.</h2>
                <p>Access your repairs, profile, and services after signing in.</p>
                {authError && <p className="feedback feedback-error">{authError}</p>}
                <button className="button button-primary" onClick={() => setAuthMode("login")}>
                  Sign in <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
        <section className="hero-section" id="home">
          <div className="hero-content page-container">
            <div className="hero-copy">
              <span className="eyebrow">A calmer way to care for your home</span>
              <h1>
                Good care for the place you <em>call home.</em>
              </h1>
              <p className="hero-description">
                Make sense of a repair, find the right help, and feel good about
                the next step.
              </p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={startRepair}>
                  Start a repair <ArrowRight size={17} />
                </button>
                <a className="button button-quiet" href="#services">
                  Explore your options <ArrowUpRight size={17} />
                </a>
              </div>
              <div className="hero-reassurance">
                <span className="reassurance-icon"><ShieldCheck size={18} /></span>
                <span>Clear options. Local professionals. Your home, your plan.</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image-frame">
                <KitchenIllustration />
              </div>
              <div className="repair-preview-card">
                <span className="preview-icon"><Wrench size={20} /></span>
                <span className="preview-copy">
                  <strong>Something needs fixing?</strong>
                  <small>Start with a description, then choose your path.</small>
                </span>
                <ArrowRight size={18} className="preview-arrow" />
              </div>
              <div className="hero-note">
                <span className="note-dot" />
                A little help goes a long way
              </div>
            </div>
          </div>
        </section>

        <section className="path-strip" aria-label="Ways to get help">
          <div className="page-container path-strip-inner">
            <span className="path-intro">Find the kind of help that fits</span>
            <a href="#services"><BookOpen size={18} /> DIY guidance</a>
            <button type="button" onClick={openRentals}><Wrench size={18} /> Equipment rental</button>
            <a href="#services"><UserRoundCheck size={18} /> Find a technician</a>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="page-container">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">Find your next step</span>
                <h2>One home. A few good ways forward.</h2>
              </div>
              <p>
                Whether you want to understand the issue or bring in a
                professional, start with the path that feels right.
              </p>
            </div>
            <div className="service-grid">
              {serviceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="service-card" key={card.title}>
                    <div className={`service-art ${card.art}`}>
                      <span className="service-art-icon"><Icon size={34} strokeWidth={1.5} /></span>
                      <span className="art-spark art-spark-one" />
                      <span className="art-spark art-spark-two" />
                      <span className="art-hill art-hill-one" />
                      <span className="art-hill art-hill-two" />
                    </div>
                    <div className="service-card-content">
                      <span className="service-category"><Icon size={16} /> {card.category}</span>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                      <span className="service-divider" />
                      <button
                        className="service-link"
                        onClick={card.title === "Get the right equipment" ? openRentals : startRepair}
                      >
                        {card.note} <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="service-footnote">
              Equipment rentals and the technician job marketplace are available
              to signed-in users. DIY guides are planned for a later release.
            </p>
          </div>
        </section>

        <section className="section steps-section" id="how-it-works">
          <div className="page-container">
            <div className="section-heading">
              <span className="eyebrow">How it works</span>
              <h2>From “what happened?” to “we have a plan.”</h2>
            </div>
            <div className="steps-grid">
              {repairSteps.map((step) => (
                <article className="step-card" key={step.number}>
                  <div className="step-marker">
                    <span>{step.number}</span>
                    <span className="step-connector" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className="step-example"><Check size={16} /> {step.example}</div>
                </article>
              ))}
            </div>
            <div className="safety-note">
              <ShieldCheck size={19} />
              <p>
                If a situation may be unsafe, stop and contact a qualified
                professional or local emergency service.
              </p>
            </div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <div className="page-container about-grid">
            <div className="about-visual">
              <RepairIllustration />
              <div className="image-caption">
                <Check size={15} /> Thoughtful help, one step at a time
              </div>
            </div>
            <div className="about-copy">
              <span className="eyebrow">Why HomeMaintain</span>
              <h2>Home care should feel more manageable.</h2>
              <p>
                A small repair can leave you with a lot of questions. HomeMaintain
                brings useful information, trusted choices, and the next step
                into one simple place.
              </p>
              <p>
                You stay in control of the plan. We help make the options easier
                to understand and act on.
              </p>
              <div className="about-principles">
                <div><MessageCircle size={19} /><strong>Clear communication</strong></div>
                <div><Check size={19} /><strong>Practical next steps</strong></div>
                <div><ShieldCheck size={19} /><strong>Careful, safe choices</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section stories-section" id="stories">
          <div className="page-container">
            <div className="section-heading">
              <span className="eyebrow">A better home routine</span>
              <h2>Small steps can make a big difference.</h2>
              <p className="illustrative-note">
                These are illustrative examples of the kinds of paths HomeMaintain
                is designed to support, not customer testimonials.
              </p>
            </div>
            <div className="story-grid">
              <article className="story-card">
                <span className="quote-mark">“</span>
                <p>
                  I knew what was wrong with the sink. I just needed help
                  figuring out what to do next.
                </p>
                <div><strong>A homeowner</strong><small>Exploring a repair</small></div>
              </article>
              <article className="story-card">
                <span className="quote-mark">“</span>
                <p>
                  Seeing the job details and available time slots made it easier
                  to plan the visit.
                </p>
                <div><strong>A local technician</strong><small>Planning an intervention</small></div>
              </article>
              <article className="story-card">
                <span className="quote-mark">“</span>
                <p>
                  I could compare a few options and choose what worked for our
                  home and our schedule.
                </p>
                <div><strong>A homeowner</strong><small>Choosing a way forward</small></div>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="page-container cta-inner">
            <div>
              <h2>Ready to make a plan for your home?</h2>
              <p>Start with the problem. We’ll help you take it from there.</p>
            </div>
            <button className="button button-light" onClick={startRepair}>
              {user ? "Open my workspace" : "Get started"} <ArrowRight size={17} />
            </button>
          </div>
        </section>

        <section className="section workspace-section" id="workspace">
          <div className="page-container">
            <div className="workspace-preview">
              <div className="workspace-intro">
                <span className="eyebrow">Your HomeMaintain workspace</span>
                <h2>Keep your home plans in one place.</h2>
                <p>
                  Sign in to publish a job, review technician applications,
                  and manage a repair from first note to scheduled visit.
                </p>
                <ul>
                  <li><Check size={17} /> Create and track home repair jobs</li>
                  <li><Check size={17} /> Review local technician proposals</li>
                  <li><Check size={17} /> Schedule and follow up on work</li>
                </ul>
              </div>
              <div className="workspace-signin-card">
                <span className="workspace-card-icon"><House size={23} /></span>
                <h3>Your next step starts here.</h3>
                <p>Sign in or create a homeowner account to use the job marketplace.</p>
                {authError && <p className="feedback feedback-error">{authError}</p>}
                <button
                  className="button button-primary button-wide"
                  onClick={() => setAuthMode("register")}
                >
                  Create an account <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={() => setAuthMode("login")}>
                  I already have an account
                </button>
                <p className="form-hint">
                  Technician accounts are created by HomeMaintain administrators.
                </p>
              </div>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {user ? (
        <footer className="site-footer app-footer">
          <div className="page-container">
            <div className="footer-main">
              <div className="footer-brand">
                <Brand
                  href="#personal-space"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate("personal-space");
                  }}
                />
                <p>Practical care for the place you call home.</p>
              </div>
              <div className="footer-column">
                <strong>Your space</strong>
                <button onClick={() => navigate("personal-space")}>Overview</button>
                <button onClick={() => navigate("my-repairs")}>My repairs</button>
              </div>
              <div className="footer-column">
                <strong>Explore</strong>
                {user.role === "homeowner" && (
                  <button onClick={() => navigate("find-pro")}>Find a pro</button>
                )}
                {technicianProfileAccess === "active" && (
                  <button onClick={() => navigate("find-job")}>Find a job</button>
                )}
                <button onClick={() => navigate("rentals")}>Equipment rentals</button>
              </div>
              <div className="footer-column">
                <strong>Account</strong>
                <button onClick={() => navigate("profile")}>Profile management</button>
                <button onClick={signOut}>Sign out</button>
              </div>
            </div>
            <div className="footer-legal">
              <span>© {new Date().getFullYear()} HomeMaintain</span>
              <span>Made for more manageable home care.</span>
            </div>
          </div>
        </footer>
      ) : (
      <footer className="site-footer">
        <div className="page-container">
          <div className="footer-main">
            <div className="footer-brand">
              <Brand />
              <p>Practical care for the place you call home.</p>
            </div>
            <div className="footer-column">
              <strong>Explore</strong>
              <a href="#services">Services</a>
              <a href="#how-it-works">How it works</a>
              <a href="#about">About us</a>
            </div>
            <div className="footer-column">
              <strong>Get started</strong>
              <a href="#workspace">Homeowner workspace</a>
              <button onClick={() => setAuthMode("login")}>Technician sign in</button>
              <a href="#stories">Stories</a>
            </div>
            <div className="footer-column">
              <strong>Need a hand?</strong>
              <button onClick={startRepair}>Start a repair</button>
              <a href="#workspace">Manage a job</a>
              <a href="#home">Back to top <ChevronDown className="back-to-top" size={14} /></a>
            </div>
          </div>
          <div className="footer-legal">
            <span>© {new Date().getFullYear()} HomeMaintain</span>
            <span>Made for more manageable home care.</span>
          </div>
        </div>
      </footer>
      )}

      {authMode && (
        <AuthDialog
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  );
}

export default App;

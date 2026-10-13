"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  ArrowRight,
  Building2,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import { navItems } from "@/lib/site-data";
import { portalAuth } from "@/lib/portal/client";

/*
  The header actions share one shape, so only the colours change
  between states. Holding the strings here keeps the desktop and
  mobile copy of each button from drifting apart.
*/
const actionShape =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-3 text-sm font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900] motion-reduce:transition-none";

const mobileActionShape =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900] motion-reduce:transition-none";

/** Resting state: quiet, warming to the brand orange on hover. */
const actionQuiet =
  "border-[#dce3ec] bg-white text-[#001b40] hover:border-[#e8a571] hover:bg-[#fff0e4]";

/*
  "You are here". Filled navy rather than the nav link underline,
  because these read as buttons and that treatment reads as a label.
*/
const actionCurrent =
  "border-[#001b40] bg-[#001b40] text-white hover:border-[#003066] hover:bg-[#003066]";

/*
  Signing out ends a session, so the button stays neutral at rest and
  only turns red under the pointer, where the intent is deliberate.
*/
const actionSignOut =
  "border-[#dce3ec] bg-white text-[#434750] hover:border-[#f2cfcd] hover:bg-[#fdecec] hover:text-[#b3261e] disabled:cursor-not-allowed disabled:opacity-60";

/*
  Every signed-in area the account button leads into. Checkout and
  payment belong to that journey, so the button stays marked as the
  current page while a visitor moves through them.
*/
const accountSection = ["/dashboard", "/admin", "/checkout", "/payment"];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const open = menuPath !== null && menuPath === pathname;

  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The CRM lives outside this app, so it is a plain external link.
  const crmHref = "https://localhost:3000";

  const accountHref = signedIn ? "/dashboard" : "/login";
  const accountLabel = signedIn ? "My Profile" : "Login";

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const accountCurrent = signedIn
    ? accountSection.some((path) => isActive(path))
    : isActive("/login");

  const closeMenu = () => setMenuPath(null);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    closeMenu();

    try {
      await signOut(portalAuth());
      // The header survives the navigation, so the button has to reset itself.
      setSigningOut(false);
      router.replace("/");
    } catch {
      // The session survived, so leave the button usable for a retry.
      setSigningOut(false);
    }
  }

  // Listen to the same Firebase Authentication instance used by the portal.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      portalAuth(),
      (user) => {
        setSignedIn(Boolean(user));
        setAuthReady(true);
        // A new session means any earlier sign-out is finished.
        if (user) setSigningOut(false);
      },
      () => {
        setSignedIn(false);
        setAuthReady(true);
        setSigningOut(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPath(null);
        toggleRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuPath(null);
      }
    }

    const desktop = window.matchMedia("(min-width: 1200px)");

    function onResize() {
      if (desktop.matches) {
        setMenuPath(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="bs-header"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setMenuPath(null);
        }
      }}
    >
      <div className="container-site bs-header-inner">
        {/* Brand */}
        <Link
          href="/"
          className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-md no-underline sm:gap-3"
          onClick={closeMenu}
          aria-label="Busiserve home"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden sm:h-[72px] sm:w-[72px]">
            {/*
              A PNG, not the original .svg. That file is an SVG
              wrapper around a 1390x1132 base64 PNG, so it carried no
              vector benefit while next/image skipped optimising it
              entirely — every visitor downloaded 1 MB for a 72px
              mark. The dimensions here match the artwork's real
              aspect ratio; the rendered size is set by the classes.
            */}
            <Image
              src="/logo-busiserve.png"
              alt="Busiserve Infotech Solution"
              aria-hidden="true"
              width={400}
              height={326}
              priority
              className="block h-full w-full shrink-0 object-contain"
            />
          </span>

          {/* <span className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-[-0.04em] sm:text-[25px]">
              <span className="text-[#001b40]">BUSI</span>
              <span className="text-[#c65300]">SERVE</span>
            </span>

            <span className="mt-1.5 hidden whitespace-nowrap text-[8px] font-semibold leading-tight tracking-[0.045em] text-[#003066] min-[380px]:block sm:text-[9px]">
              Infotech Solution FOR GROWTH
            </span>
          </span> */}
        </Link>

        {/* Desktop navigation */}
        <nav
          className="bs-desktop-nav"
          style={{ gap: "clamp(12px, 1.4vw, 22px)" }}
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`bs-nav-link${
                isActive(item.href) ? " is-active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop account and contact actions */}
        <div className="hidden shrink-0 items-center gap-2 min-[1200px]:flex">
          <a
            href={crmHref}
            className={`${actionShape} ${actionQuiet}`}
          >
            <Building2 size={18} aria-hidden="true" />
            Company CRM
          </a>

          {authReady ? (
            <>
              <Link
                href={accountHref}
                aria-current={accountCurrent ? "page" : undefined}
                className={`${actionShape} ${
                  accountCurrent ? actionCurrent : actionQuiet
                }`}
              >
                <UserRound size={18} aria-hidden="true" />
                {accountLabel}
              </Link>

              {signedIn && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className={`${actionShape} ${actionSignOut}`}
                >
                  <LogOut size={18} aria-hidden="true" />

                  {/*
                    The label needs room that the 1200px breakpoint
                    does not have once the CRM button joins the row.
                  */}
                  <span className="hidden min-[1366px]:inline">
                    {signingOut ? "Signing out…" : "Sign out"}
                  </span>
                </button>
              )}
            </>
          ) : (
            <span
              className="inline-flex min-h-12 w-28 items-center justify-center rounded-xl bg-[#eef3fa]"
              role="status"
            >
              <span className="sr-only">Loading account</span>
            </span>
          )}

          <Link
            href="/contact"
            className="bs-button bs-button-primary whitespace-nowrap"
          >
            Let’s talk
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          ref={toggleRef}
          type="button"
          className="bs-menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="bs-mobile-menu"
          onClick={() => setMenuPath(open ? null : pathname)}
        >
          {open ? (
            <X size={25} aria-hidden="true" />
          ) : (
            <Menu size={25} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile navigation */}
      <div
        id="bs-mobile-menu"
        className="bs-mobile-menu"
        hidden={!open}
      >
        <nav
          className="container-site bs-mobile-nav"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`bs-mobile-link${
                isActive(item.href) ? " is-active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="my-2 border-t border-[#dce3ec]" />

          <a
            href={crmHref}
            onClick={closeMenu}
            className={`${mobileActionShape} ${actionQuiet}`}
          >
            <Building2 size={19} aria-hidden="true" />
            Company CRM
          </a>

          {authReady ? (
            <>
              <Link
                href={accountHref}
                onClick={closeMenu}
                aria-current={accountCurrent ? "page" : undefined}
                className={`${mobileActionShape} ${
                  accountCurrent ? actionCurrent : actionQuiet
                }`}
              >
                <UserRound size={19} aria-hidden="true" />
                {accountLabel}
              </Link>

              {signedIn && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className={`${mobileActionShape} ${actionSignOut}`}
                >
                  <LogOut size={19} aria-hidden="true" />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              )}
            </>
          ) : (
            <p
              role="status"
              className="px-4 py-3 text-sm text-[#434750]"
            >
              Loading account…
            </p>
          )}

          <Link
            href="/contact"
            onClick={closeMenu}
            className="bs-button bs-button-primary"
          >
            Let’s talk
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
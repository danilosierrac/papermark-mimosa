export type BrandLogoFields = {
  logo?: string | null;
  hideLogo?: boolean | null;
};

export type ResolvedBrandLogo =
  | { kind: "custom"; src: string }
  | { kind: "papermark" }
  | { kind: "none" };

/**
 * What goes in the logo slot of the viewer, the access form and the OTP
 * email: the team's own logo, nothing at all, or the fallback wordmark.
 */
export function resolveBrandLogo(
  brand?: BrandLogoFields | null,
): ResolvedBrandLogo {
  if (brand?.hideLogo) return { kind: "none" };
  if (brand?.logo) return { kind: "custom", src: brand.logo };
  return { kind: "papermark" };
}

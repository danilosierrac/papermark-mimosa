import { GetStaticPropsContext } from "next";
import { useRouter } from "next/router";

import { useEffect, useState } from "react";

import { Brand, DataroomBrand, DataroomDocument } from "@prisma/client";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { ExtendedRecordMap } from "notion-types";
import { parsePageId } from "notion-utils";
import z from "zod";

import { fetchLinkDataById } from "@/lib/api/links/link-data";
import { getFeatureFlags } from "@/lib/featureFlags";
import { useUrlPasscode } from "@/lib/hooks/use-url-passcode";
import {
  type ViewerI18nPageProps,
  buildViewerI18nPageProps,
} from "@/lib/i18n/viewer-page-props";
import notion from "@/lib/notion";
import {
  addSignedUrls,
  fetchMissingPageReferences,
  normalizeRecordMap,
} from "@/lib/notion/utils";
import {
  CustomUser,
  LinkWithDataroom,
  LinkWithDocument,
  NotionTheme,
} from "@/lib/types";

import LoadingSpinner from "@/components/ui/loading-spinner";
import CustomMetaTag from "@/components/view/custom-metatag";
import DocumentView from "@/components/view/document-view";
import { ViewerI18nProvider } from "@/components/view/viewer-i18n-provider";
import { ViewerNotFound } from "@/components/view/viewer-not-found";

type DocumentLinkData = {
  linkType: "DOCUMENT_LINK";
  link: LinkWithDocument;
  brand: Brand | null;
};

export interface ViewPageProps extends Partial<ViewerI18nPageProps> {
  frozen?: boolean;
  linkData: DocumentLinkData;
  notionData: {
    rootNotionPageId: string | null;
    recordMap: ExtendedRecordMap | null;
    theme: NotionTheme | null;
  };
  meta: {
    enableCustomMetatag: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    metaUrl: string | null;
    metaFavicon: string | null;
  };
  showPoweredByBanner: boolean;
  showAccountCreationSlide: boolean;
  useAdvancedExcelViewer: boolean;
  hideFooterOnAccessForm: boolean;
  logoOnAccessForm: boolean;
  dataroomIndexEnabled?: boolean;
  annotationsEnabled?: boolean;
  textSelectionEnabled?: boolean;
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { linkId: linkIdParam } = context.params as { linkId: string };

  try {
    const linkId = z.string().cuid().parse(linkIdParam);

    // Fetch link data directly from database to avoid internal HTTP fetch
    // which can be blocked by Vercel's edge protection (403 errors)
    const result = await fetchLinkDataById({ linkId });

    if (result.status === "frozen") {
      return {
        props: {
          frozen: true,
        },
        revalidate: 10,
      };
    }

    if (result.status !== "ok") {
      return {
        notFound: true,
      };
    }

    const { linkType, link, brand, publicMeta } = result;

    if (!linkType) {
      return {
        notFound: true,
      };
    }

    // Pre-resolve viewer i18n props (default locale + bundles) so every
    // return path below ships them. Brand may be null for workflow links —
    // helper falls back to English in that case.
    const i18nProps = await buildViewerI18nPageProps(brand as any);


    if (!link) {
      return {
        notFound: true,
      };
    }

    // Manage the data for the document link
    if (linkType === "DOCUMENT_LINK") {
      let pageId = null;
      let recordMap = null;
      let theme = null;

      const { type, file, ...versionWithoutTypeAndFile } =
        link.document.versions[0];

      if (type === "notion") {
        try {
          theme = new URL(file).searchParams.get("mode");
          const notionPageId = parsePageId(file, { uuid: false });
          if (!notionPageId) {
            return { notFound: true };
          }

          pageId = notionPageId;
          recordMap = await notion.getPage(pageId, { signFileUrls: false });
          // Fetch missing page references that are embedded in rich text (e.g., table cells with multiple page links)
          await fetchMissingPageReferences(recordMap);
          // Normalize double-nested block structures from the Notion API
          normalizeRecordMap(recordMap);
          await addSignedUrls({ recordMap });
        } catch (notionError) {
          const message =
            notionError instanceof Error
              ? notionError.message
              : String(notionError);
          console.error("Notion API error:", message);
          // Return a temporary error page instead of 404
          return {
            props: { notionError: true },
            revalidate: 30,
          };
        }
      }

      const { team, teamId, advancedExcelEnabled, ...linkDocument } =
        link.document;
      const teamPlan = team?.plan || "free";

      // Check feature flags for document links
      const featureFlags = await getFeatureFlags({ teamId });
      const annotationsEnabled = featureFlags.annotations;
      const textSelectionEnabled = featureFlags.textSelection;
      const logoOnAccessFormEnabled = featureFlags.logoOnAccessForm;
      const hideFooterOnAccessFormEnabled = featureFlags.hideFooterOnAccessForm;

      return {
        props: {
          linkData: {
            linkType: "DOCUMENT_LINK",
            link: {
              ...link,
              teamId: teamId,
              document: {
                ...linkDocument,
                versions: [versionWithoutTypeAndFile],
              },
            },
            brand,
          },
          notionData: {
            rootNotionPageId: null, // do not pass rootNotionPageId to the client
            recordMap,
            theme,
          },
          meta: {
            enableCustomMetatag: publicMeta.enableCustomMetatag,
            metaTitle: publicMeta.metaTitle,
            metaDescription: publicMeta.metaDescription,
            metaImage: publicMeta.metaImage,
            metaFavicon: publicMeta.metaFavicon,
            metaUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://docs.mimosa.computer"}/view/${linkId}`,
          },
          // Internal-only deployment: never show the "get your own" upsell.
          showPoweredByBanner: false,
          showAccountCreationSlide: false,
          useAdvancedExcelViewer: advancedExcelEnabled,
          hideFooterOnAccessForm: hideFooterOnAccessFormEnabled,
          logoOnAccessForm: logoOnAccessFormEnabled,
          annotationsEnabled,
          textSelectionEnabled,
          ...i18nProps,
        },
        revalidate: brand || recordMap ? 10 : 60,
      };
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Fetching error:", message);
    return { props: { error: true }, revalidate: 30 };
  }
};

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

function ViewPageInner({
  frozen,
  linkData,
  notionData,
  meta,
  showPoweredByBanner,
  showAccountCreationSlide,
  useAdvancedExcelViewer,
  hideFooterOnAccessForm,
  logoOnAccessForm,
  dataroomIndexEnabled,
  annotationsEnabled,
  textSelectionEnabled,
  error,
  notionError,
}: ViewPageProps & { error?: boolean; notionError?: boolean }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);
  const [storedEmail, setStoredEmail] = useState<string | undefined>(undefined);
  const urlPasscode = useUrlPasscode();

  useEffect(() => {
    // Retrieve token from cookie on component mount
    const cookieToken =
      Cookies.get("pm_vft") ||
      Cookies.get(`pm_drs_flag_${router.query.linkId}`);
    const storedEmail = window.localStorage.getItem("papermark.email");
    if (cookieToken) {
      setStoredToken(cookieToken);
      if (storedEmail) {
        setStoredEmail(storedEmail.toLowerCase());
      }
    }
  }, [router.query.linkId]);

  if (router.isFallback) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    );
  }

  if (frozen) {
    return <ViewerNotFound reason="dataroomClosed" />;
  }

  if (error) {
    return <ViewerNotFound reason="loadErrorRefresh" />;
  }

  if (notionError) {
    return <ViewerNotFound reason="loadErrorRetry" />;
  }

  const {
    email: verifiedEmail,
    d: disableEditEmail,
    previewToken,
    preview,
  } = router.query as {
    email: string;
    d: string;
    previewToken?: string;
    preview?: string;
  };
  const disableEditPassword = !!disableEditEmail && !!urlPasscode;
  const { linkType } = linkData;


  // Render the document view for DOCUMENT_LINK
  if (linkType === "DOCUMENT_LINK") {
    const { link, brand } = linkData as DocumentLinkData;

    if (!linkData || status === "loading" || router.isFallback) {
      return (
        <>
          <CustomMetaTag
            favicon={meta.metaFavicon}
            enableBranding={meta.enableCustomMetatag ?? false}
            title={
              meta.metaTitle ?? `${link?.document?.name} · mimosa`
            }
            description={meta.metaDescription ?? null}
            imageUrl={meta.metaImage ?? null}
            url={meta.metaUrl ?? ""}
          />
          <div className="flex h-screen items-center justify-center">
            <LoadingSpinner className="h-20 w-20" />
          </div>
        </>
      );
    }

    const {
      expiresAt,
      emailProtected,
      emailAuthenticated,
      password: linkPassword,
      enableAgreement,
      isArchived,
    } = link;

    const { email: userEmail, id: userId } =
      (session?.user as CustomUser) || {};

    // If the link is expired, show a 404 page
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <ViewerNotFound reason="expired" />;
    }

    if (isArchived) {
      return <ViewerNotFound reason="archived" />;
    }

    return (
      <>
        <CustomMetaTag
          favicon={meta.metaFavicon}
          enableBranding={meta.enableCustomMetatag ?? false}
          title={
            meta.metaTitle ?? `${link?.document?.name} · mimosa`
          }
          description={meta.metaDescription ?? null}
          imageUrl={meta.metaImage ?? null}
          url={meta.metaUrl ?? ""}
        />
        <DocumentView
          link={link}
          userEmail={verifiedEmail ?? storedEmail ?? userEmail}
          userId={userId}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          notionData={notionData}
          brand={brand}
          showPoweredByBanner={showPoweredByBanner}
          showAccountCreationSlide={showAccountCreationSlide}
          useAdvancedExcelViewer={useAdvancedExcelViewer}
          previewToken={previewToken}
          disableEditEmail={!!disableEditEmail}
          urlPasscode={urlPasscode}
          disableEditPassword={disableEditPassword}
          hideFooterOnAccessForm={hideFooterOnAccessForm}
          logoOnAccessForm={logoOnAccessForm}
          token={storedToken}
          verifiedEmail={verifiedEmail}
          annotationsEnabled={annotationsEnabled}
          textSelectionEnabled={textSelectionEnabled}
        />
      </>
    );
  }

}

export default function ViewPage(
  props: ViewPageProps & { error?: boolean; notionError?: boolean },
) {
  // Fall back to English when `getStaticProps` hit an early-exit branch
  // (frozen / error / notionError) and never produced i18n props.
  const locale = props.i18n?.locale ?? "en";
  const resources = props.i18n?.resources ?? {};
  return (
    <ViewerI18nProvider locale={locale} resources={resources}>
      <ViewPageInner {...props} />
    </ViewerI18nProvider>
  );
}

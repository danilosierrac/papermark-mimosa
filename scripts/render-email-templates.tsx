// Renders the live email templates to HTML so brand-check.sh can grep the
// actual output, not just the source (catches anything nested components
// contribute, e.g. Footer inside ViewedDocument).
import { render } from "react-email";

import OtpEmailVerification from "../components/emails/otp-verification";
import ViewedDocument from "../components/emails/viewed-document";

async function main() {
  const viewed = await render(
    ViewedDocument({
      documentId: "test",
      documentName: "Test Document",
      linkName: "Test Link",
      viewerEmail: "test@example.com",
      locationString: "Berlin, Germany",
    }),
  );
  const otp = await render(
    OtpEmailVerification({
      email: "test@example.com",
      code: "123456",
      isDataroom: false,
    }),
  );
  console.log("===VIEWED_DOCUMENT===");
  console.log(viewed);
  console.log("===OTP_VERIFICATION===");
  console.log(otp);
}

main();

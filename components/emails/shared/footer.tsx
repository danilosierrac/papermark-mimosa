import React from "react";

import { Hr, Link, Section, Text } from "react-email";

export const Footer = ({
  withAddress = false,
  footerText = "questions about this email? reply, we read every one.",
}: {
  withAddress?: boolean;
  footerText?: string | React.ReactNode;
}) => {
  return (
    <>
      <Hr />
      <Section className="text-[#9F9F9F]">
        <Text className="text-xs lowercase">
          mimosa GmbH · Greifswalder Str. 23, 10405 Berlin{" "}
          {withAddress && <br />}
          <Link
            className="text-[#666] underline"
            href="https://mimosaagency.com/imprint"
          >
            imprint
          </Link>
        </Text>
        <Text className="text-xs">{footerText}</Text>
      </Section>
    </>
  );
};

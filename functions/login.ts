import { Context } from "@netlify/functions";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async (req: Request, context: Context) => {
  const { username, password } = await req.json();

  let browser;
  try {
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    const executablePath =
      process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath());

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
    });

    const page = await browser.newPage();
    await page.goto("https://cv.uoc.edu/auth?campus-nplincampus", {
      waitUntil: "networkidle2",
    });
    await page.type("#username", username);
    await page.type("#password", password);
    await page.click("#submit-identification-form");
    await page.waitForNavigation();

    const cookies = await page.cookies();
    const campusJWT = cookies.find((cookie) => cookie.name === "campusJWT");

    if (!campusJWT) {
      console.error("Login failed or cookies not found");
      return new Response(JSON.stringify({ message: "Login failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = Buffer.from(
      campusJWT.value.split(".")[1],
      "base64"
    ).toString();
    const campusJwt: CampusJwtType = JSON.parse(payload);

    if (typeof campusJwt.sub === "string") {
      campusJwt.sub = JSON.parse(campusJwt.sub);
    }

    return new Response(JSON.stringify(campusJwt, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export type CampusJwtType = {
  jti: string;
  iat: number;
  sub: SubType;
  iss: string;
  exp: number;
};

export type SubType = {
  schacPersonalUniqueCode: string;
  commonName: string;
  preferredLanguage: string;
  campusSession: string;
  mail: string;
  eduPersonAffiliation: string;
  displayName: string;
  employeeNumber: string;
  uid: string;
  eduPersonPrimaryAffiliation: string;
  eduPersonScopedAffiliation: string;
  eduPersonTargetedID: string | null;
  schacHomeOrganization: string;
  eduPersonPrincipalName: string;
  sn: string;
  lang: string;
  email: string;
  eduPersonEntitlement: string;
  campusSessionId: string;
  givenName: string;
  fullName: string;
  schacPersonalUniqueID: string;
  schacHomeOrganizationType: string;
  schacGender: string;
  immutableId: string;
  idp: string;
  name: string;
  lmsStatus: string;
};

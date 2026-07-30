import { describe, expect, it } from "vitest";
import { isKineyDeployment } from "../../src/app/deploymentHost";

describe("isKineyDeployment", () => {
  it.each([
    "kiney.de",
    "reactor.kiney.de",
    "deep.subdomain.kiney.de",
    "REACTOR.KINEY.DE",
    "reactor.kiney.de.",
  ])("erkennt Kiney-Deployments: %s", (hostname) => {
    expect(isKineyDeployment(hostname)).toBe(true);
  });

  it.each([
    "localhost",
    "127.0.0.1",
    "example.org",
    "notkiney.de",
    "kiney.de.example.org",
  ])("blendet das Impressum auf fremden Hosts aus: %s", (hostname) => {
    expect(isKineyDeployment(hostname)).toBe(false);
  });
});

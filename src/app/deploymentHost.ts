const KINEY_DOMAIN = "kiney.de";

export function isKineyDeployment(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalizedHostname === KINEY_DOMAIN ||
    normalizedHostname.endsWith(`.${KINEY_DOMAIN}`)
  );
}

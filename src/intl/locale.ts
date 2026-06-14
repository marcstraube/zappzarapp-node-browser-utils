/**
 * Locale negotiation — choose the best supported locale for a request.
 *
 * Pure and total: it never throws and never reads `navigator`. Locale
 * *detection* belongs to the `device` module; compose them at the app layer,
 * e.g. `resolveLocale(supported, DeviceInfo.languages())`.
 */

/** Primary language subtag of a BCP-47 tag, lower-cased (e.g. `de-AT` → `de`). */
function primaryLanguage(tag: string): string {
  // split() always yields at least one element.
  return tag.toLowerCase().split('-')[0] as string;
}

/**
 * Pick the best match from `supported` for the `requested` locale(s).
 *
 * Matching is, per requested tag in order: an exact (case-insensitive) match,
 * then a primary-language match (`de-AT` matches `de`). If nothing matches,
 * the first supported locale is returned as a guaranteed fallback.
 *
 * @param supported Locales the app actually provides, in preference order.
 * @param requested Requested locale or ordered list (e.g. from `DeviceInfo.languages()`).
 * @returns A locale from `supported`, or `''` only if `supported` is empty.
 */
export function resolveLocale(
  supported: readonly string[],
  requested: string | readonly string[]
): string {
  const requestList = typeof requested === 'string' ? [requested] : requested;

  for (const req of requestList) {
    const reqLower = req.toLowerCase();
    const exact = supported.find((tag) => tag.toLowerCase() === reqLower);
    if (exact !== undefined) {
      return exact;
    }
    const reqLang = primaryLanguage(req);
    const byLanguage = supported.find((tag) => primaryLanguage(tag) === reqLang);
    if (byLanguage !== undefined) {
      return byLanguage;
    }
  }

  return supported[0] ?? '';
}

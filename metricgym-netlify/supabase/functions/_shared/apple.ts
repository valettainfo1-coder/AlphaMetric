/* METRICGYM — Apples Kaufbelege prüfen.
   ----------------------------------------------------------------------------
   Apple liefert jeden Kauf als JWS (JSON Web Signature): Kopf, Nutzlast und
   Signatur, getrennt durch Punkte. Im Kopf steckt unter `x5c` eine Kette aus
   drei Zertifikaten — Blatt, Zwischenstelle, Wurzel.

   WARUM DIESE DATEI SO AUSFÜHRLICH IST: Wer die Nutzlast nur dekodiert, ohne
   die Kette zu prüfen, schaltet jedem ELITE frei, der sich ein JSON
   zusammenschreibt. Die Signatur IST der Kaufnachweis. Deshalb wird hier
   vollständig geprüft:

     1. Wurzel der mitgelieferten Kette == Apples echtes Wurzelzertifikat
        (unten fest eingebaut, nicht aus dem Netz geholt)
     2. Zwischenstelle von der Wurzel signiert
     3. Blatt von der Zwischenstelle signiert
     4. alle drei zeitlich gültig
     5. Signatur der Nutzlast gegen den Schlüssel im Blatt
     6. erst DANN wird der Nutzlast geglaubt

   Deno bringt Web Crypto mit, aber keinen X.509-Parser. Die paar hundert
   Zeilen DER-Zerlegung sind der Preis dafür — eine fremde Bibliothek in den
   Kaufweg zu setzen wäre der schlechtere Tausch.                            */

/* ===== Apple Root CA - G3 =====
   Geholt von https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
   SHA-256: 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:
            6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
   Gültig bis 30.04.2039. Fest eingebaut, damit nichts zur Laufzeit aus dem
   Netz kommt, was über Geld entscheidet. */
const WURZEL_G3 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEcz" +
  "MSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkG" +
  "A1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENB" +
  "IC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMu" +
  "MQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWm" +
  "BSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEK" +
  "MaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQD" +
  "AgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4" +
  "at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

/* Nur für Tests: erlaubt, die Wurzel zu ersetzen. In Produktion NIE gesetzt —
   die Function liest diese Variable nicht aus der Umgebung. */
export const WURZEL = { der: b64ToBytes(WURZEL_G3) };

/* ===== Basis ===== */
function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToBytes(s: string): Uint8Array {
  return b64ToBytes(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
}
const gleich = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ===== ASN.1 / DER =====
   Ein DER-Element ist Tag, Länge, Inhalt. `kopf` ist die Position des Tags —
   die braucht man, weil zum Signieren das Element MIT Tag und Länge gehasht
   wird, nicht nur sein Inhalt. */
type TLV = { tag: number; kopf: number; von: number; bis: number };

function tlv(b: Uint8Array, pos: number): TLV {
  const tag = b[pos];
  let p = pos + 1;
  let len = b[p++];
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error("DER: unbrauchbare Länge");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p++];
  }
  if (p + len > b.length) throw new Error("DER: Länge zeigt über das Ende hinaus");
  return { tag, kopf: pos, von: p, bis: p + len };
}

function kinder(b: Uint8Array, t: TLV): TLV[] {
  const out: TLV[] = [];
  let p = t.von;
  while (p < t.bis) { const c = tlv(b, p); out.push(c); p = c.bis; }
  return out;
}

/* ===== Zertifikat ===== */
type Zert = {
  der: Uint8Array;
  tbs: Uint8Array;          // signierter Teil, mit Tag und Länge
  sigAlgOid: Uint8Array;
  sig: Uint8Array;          // DER: SEQUENCE { r, s }
  spki: Uint8Array;         // öffentlicher Schlüssel, importierbar
  kurve: "P-256" | "P-384";
  abNicht: number;          // ms
  bisNicht: number;         // ms
};

const OID_P256 = b64ToBytes("KoZIzj0DAQc=");   // 1.2.840.10045.3.1.7
const OID_P384 = b64ToBytes("K4EEACI=");       // 1.3.132.0.34  (secp384r1)

function zeitLesen(b: Uint8Array, t: TLV): number {
  const s = new TextDecoder().decode(b.subarray(t.von, t.bis));
  // UTCTime (0x17): JJMMTTHHMMSSZ · GeneralizedTime (0x18): JJJJMMTTHHMMSSZ
  const g = t.tag === 0x18;
  const jj = g ? +s.slice(0, 4) : (+s.slice(0, 2) < 50 ? 2000 + +s.slice(0, 2) : 1900 + +s.slice(0, 2));
  const o = g ? 4 : 2;
  return Date.UTC(jj, +s.slice(o, o + 2) - 1, +s.slice(o + 2, o + 4),
    +s.slice(o + 4, o + 6), +s.slice(o + 6, o + 8), +s.slice(o + 8, o + 10) || 0);
}

function zertLesen(der: Uint8Array): Zert {
  const wurzel = tlv(der, 0);
  const [tbsT, algT, sigT] = kinder(der, wurzel);
  if (!tbsT || !algT || !sigT) throw new Error("Zertifikat: unerwarteter Aufbau");

  const tbsKinder = kinder(der, tbsT);
  /* version ist [0] EXPLICIT und optional — vorhanden, wenn das erste Kind
     den Tag 0xA0 trägt. Danach: serial, sigAlg, issuer, validity, subject, spki */
  const i = tbsKinder[0]?.tag === 0xa0 ? 1 : 0;
  const gueltig = tbsKinder[i + 3];
  const spkiT = tbsKinder[i + 5];
  if (!gueltig || !spkiT) throw new Error("Zertifikat: Gültigkeit oder Schlüssel fehlt");

  const [ab, bis] = kinder(der, gueltig);
  const spki = der.subarray(spkiT.kopf, spkiT.bis);

  /* Kurve aus dem Schlüssel: SPKI = SEQUENCE { AlgorithmIdentifier, BIT STRING }
     AlgorithmIdentifier = SEQUENCE { OID ecPublicKey, OID Kurve } */
  const algKinder = kinder(der, kinder(der, spkiT)[0]);
  const kurvenOid = der.subarray(algKinder[1].von, algKinder[1].bis);
  const kurve = gleich(kurvenOid, OID_P256) ? "P-256"
    : gleich(kurvenOid, OID_P384) ? "P-384"
      : (() => { throw new Error("Zertifikat: unbekannte Kurve"); })();

  /* signatureValue ist ein BIT STRING; das erste Byte zählt unbenutzte Bits. */
  const sig = der.subarray(sigT.von + 1, sigT.bis);
  const sigAlgKinder = kinder(der, algT);

  return {
    der, tbs: der.subarray(tbsT.kopf, tbsT.bis),
    sigAlgOid: der.subarray(sigAlgKinder[0].von, sigAlgKinder[0].bis),
    sig, spki, kurve,
    abNicht: zeitLesen(der, ab), bisNicht: zeitLesen(der, bis),
  };
}

/* ECDSA-Signaturen stehen in Zertifikaten als DER SEQUENCE { r, s }, Web Crypto
   will r‖s in fester Breite. Führende Nullen raus, rechts ausrichten. */
function derSigZuRoh(der: Uint8Array, breite: number): Uint8Array {
  const [r, s] = kinder(der, tlv(der, 0));
  const out = new Uint8Array(breite * 2);
  for (const [t, ziel] of [[r, 0], [s, breite]] as [TLV, number][]) {
    let a = der.subarray(t.von, t.bis);
    while (a.length > 1 && a[0] === 0) a = a.subarray(1);
    if (a.length > breite) throw new Error("Signatur: Zahl zu groß");
    out.set(a, ziel + breite - a.length);
  }
  return out;
}

const OID_SHA256 = b64ToBytes("KoZIzj0EAwI=");  // ecdsa-with-SHA256
const OID_SHA384 = b64ToBytes("KoZIzj0EAwM=");  // ecdsa-with-SHA384

/* Prüft: wurde `kind` wirklich von `eltern` signiert? */
async function signiertVon(kind: Zert, eltern: Zert): Promise<boolean> {
  const hash = gleich(kind.sigAlgOid, OID_SHA256) ? "SHA-256"
    : gleich(kind.sigAlgOid, OID_SHA384) ? "SHA-384"
      : null;
  if (!hash) return false;
  const breite = eltern.kurve === "P-384" ? 48 : 32;
  const key = await crypto.subtle.importKey(
    "spki", eltern.spki, { name: "ECDSA", namedCurve: eltern.kurve }, false, ["verify"]);
  return await crypto.subtle.verify(
    { name: "ECDSA", hash }, key, derSigZuRoh(kind.sig, breite), kind.tbs);
}

/* ===== Die Nutzlast, wie Apple sie schickt ===== */
export type Transaktion = {
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  appAccountToken?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  revocationReason?: number;
  type?: string;
  environment?: string;
  [k: string]: unknown;
};

/* ===== Herzstück: JWS prüfen ===== */
export async function jwsPruefen(jws: string, wurzelDer = WURZEL.der): Promise<Transaktion> {
  const teile = jws.split(".");
  if (teile.length !== 3) throw new Error("Beleg hat nicht die Form eines JWS");

  const kopf = JSON.parse(new TextDecoder().decode(b64urlToBytes(teile[0])));
  if (kopf.alg !== "ES256") throw new Error(`Beleg: unerwartetes Verfahren ${kopf.alg}`);
  if (!Array.isArray(kopf.x5c) || kopf.x5c.length < 2) throw new Error("Beleg: Zertifikatskette fehlt");

  const kette = kopf.x5c.map((c: string) => zertLesen(b64ToBytes(c)));
  const jetzt = Date.now();
  for (const z of kette) {
    if (jetzt < z.abNicht || jetzt > z.bisNicht) throw new Error("Beleg: Zertifikat zeitlich ungültig");
  }

  /* Die Wurzel der gelieferten Kette muss Byte für Byte Apples Wurzel sein.
     Ein selbst gebauter, formal korrekter Baum scheitert genau hier. */
  const mitgeliefert = kette[kette.length - 1];
  if (!gleich(mitgeliefert.der, wurzelDer)) throw new Error("Beleg: fremdes Wurzelzertifikat");
  const wurzel = zertLesen(wurzelDer);

  /* Kette von oben nach unten: jedes Glied muss vom nächsten signiert sein. */
  for (let i = 0; i < kette.length - 1; i++) {
    const eltern = i + 1 === kette.length - 1 ? wurzel : kette[i + 1];
    if (!(await signiertVon(kette[i], eltern))) throw new Error(`Beleg: Kette bricht bei Glied ${i}`);
  }

  /* Nutzlast gegen den Schlüssel im Blatt. */
  const blatt = kette[0];
  if (blatt.kurve !== "P-256") throw new Error("Beleg: Blattzertifikat ist nicht P-256");
  const key = await crypto.subtle.importKey(
    "spki", blatt.spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, key,
    b64urlToBytes(teile[2]),
    new TextEncoder().encode(`${teile[0]}.${teile[1]}`));
  if (!ok) throw new Error("Beleg: Signatur passt nicht zur Nutzlast");

  return JSON.parse(new TextDecoder().decode(b64urlToBytes(teile[1]))) as Transaktion;
}

/* ===== Produkt → Stufe =====
   Diese Kennungen müssen in App Store Connect GENAU so angelegt sein.
   Unbekanntes Produkt ergibt null — und dann wird nichts freigeschaltet. */
export const PRODUKTE: Record<string, "pro" | "elite"> = {
  "de.metricgym.pro.monthly": "pro",
  "de.metricgym.pro.yearly": "pro",
  "de.metricgym.elite.monthly": "elite",
  "de.metricgym.elite.yearly": "elite",
};
export const stufeVon = (productId?: string) =>
  (productId && PRODUKTE[productId]) || null;

/* ===== Transaktion → Tabellenzeile =====
   `status` ist das, wonach my_tier() fragt. Zurückgezogen (Rückerstattung,
   Familienfreigabe entfernt) und abgelaufen sind beides 'canceled': in beiden
   Fällen gibt es keinen Anspruch mehr. */
export function zeileAus(t: Transaktion, userId: string) {
  const stufe = stufeVon(t.productId);
  if (!stufe) throw new Error(`Unbekanntes Produkt: ${t.productId}`);
  const zurueckgezogen = typeof t.revocationDate === "number";
  const ende = typeof t.expiresDate === "number" ? new Date(t.expiresDate) : null;
  const abgelaufen = !!ende && ende.getTime() <= Date.now();
  return {
    user_id: userId,
    source: "apple",
    tier: stufe,
    status: zurueckgezogen || abgelaufen ? "canceled" : "active",
    current_period_end: ende ? ende.toISOString() : null,
    apple_original_transaction_id: t.originalTransactionId ?? t.transactionId ?? null,
    updated_at: new Date().toISOString(),
  };
}

/* ===== Meldungsart → Status =====
   Verlängerung und Ablauf stehen schon in der Transaktion (expiresDate,
   revocationDate) und sind damit von zeileAus() abgedeckt. Hier kommt nur
   obendrauf, was Apple weiß und die Transaktion nicht sagt.

   Bewusst NICHT beendet wird bei DID_CHANGE_RENEWAL_STATUS/AUTO_RENEW_DISABLED:
   wer kündigt, hat bis zum Ende der bezahlten Periode Anspruch. my_tier()
   beendet ihn von selbst, sobald current_period_end erreicht ist. Wer hier
   sofort abschaltet, nimmt bezahlte Zeit weg.

   CONSUMPTION_REQUEST ist eine Anfrage Apples zur Rückerstattungsprüfung und
   KEINE Entscheidung — die kommt später als REFUND oder gar nicht. */
export function statusAus(basis: string, typ?: string, unter?: string): string {
  const t = String(typ ?? ""), u = String(unter ?? "");
  if (t === "EXPIRED" || t === "REFUND" || t === "REVOKE") return "canceled";
  if (t === "DID_FAIL_TO_RENEW") return u === "GRACE_PERIOD" ? "active" : "past_due";
  return basis;
}

/* Welche Umgebung ist erlaubt? Produktion akzeptiert nur Produktions-Belege;
   wer APPLE_ALLOW_SANDBOX=1 setzt, lässt zum Testen auch Sandbox zu. */
export function umgebungOk(t: Transaktion): boolean {
  const sandboxOk = Deno.env.get("APPLE_ALLOW_SANDBOX") === "1";
  const u = String(t.environment ?? "");
  return u === "Production" || (sandboxOk && u === "Sandbox");
}

export const BUNDLE_ID = () => Deno.env.get("APPLE_BUNDLE_ID") ?? "de.metricgym.app";

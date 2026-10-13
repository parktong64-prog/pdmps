// 붙여넣은 글, 엑셀·CSV·텍스트 파일에서 휴대폰 번호만 뽑아낸다.
// 010/011/016/017/018/019로 시작하는 번호만 인정하고, 자릿수가 맞지 않는 값은 건너뛴다.

const PHONE_RE = /01[016789][\s.\-]?\d{3,4}[\s.\-]?\d{4}/g;

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function extractPhones(text: string): { phones: string[]; duplicates: number } {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const m of text.match(PHONE_RE) ?? []) {
    const p = normalizePhone(m);
    if (!p) continue;
    if (seen.has(p)) duplicates++;
    else seen.add(p);
  }
  return { phones: [...seen], duplicates };
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** .xlsx(zip)에서 시트와 공유 문자열의 텍스트만 꺼낸다. 외부 라이브러리 없이 브라우저 기본 기능만 쓴다. */
async function xlsxToText(buf: ArrayBuffer): Promise<string> {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("엑셀 파일 형식이 아닙니다.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder("utf-8");
  const parts: string[] = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/^xl\/(sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name)) continue;
    const lhNameLen = dv.getUint16(localOff + 26, true);
    const lhExtraLen = dv.getUint16(localOff + 28, true);
    const start = localOff + 30 + lhNameLen + lhExtraLen;
    const raw = u8.subarray(start, start + csize);
    const bytes = method === 0 ? raw : await inflateRaw(raw);
    const xml = dec.decode(bytes);
    for (const m of xml.matchAll(/<(?:t|v)(?:\s[^>]*)?>([^<]*)<\/(?:t|v)>/g)) parts.push(m[1]);
  }
  return parts.join("\n");
}

export async function readFileAsText(file: File): Promise<string> {
  if (/\.xlsx$/i.test(file.name)) return xlsxToText(await file.arrayBuffer());
  return file.text();
}

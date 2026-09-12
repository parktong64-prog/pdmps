"use server";

// 환자가 올린 사진으로 AI 페이스리프트 시뮬레이션(전후 비교) 이미지를 생성한다.
// 실제 사진 편집이 필요해 Google Gemini 이미지 생성 모델(gemini-2.5-flash-image)을 사용한다.

export type SimulationAngle = "left" | "front" | "right";

const MODEL = "gemini-2.5-flash-image";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// 45도 위쪽(관자놀이 방향) 벡터로 당겨지는 SMAS 페이스리프트 결과를 자연스럽게 시뮬레이션하도록 지시한다.
const PROMPTS: Record<SimulationAngle, string> = {
  front:
    "This is a medical face-lift consultation simulation photo. Edit this portrait to show a clearly visible, dramatic — but still photorealistic — result of a surgical face lift where the mid-face and cheek tissue has been pulled firmly along an upward-oblique vector at about 45 degrees, from the nasolabial fold area toward the temple/ear. Push this lifting effect further than a subtle correction: the nasolabial folds (smile lines) must be almost completely erased — only the faintest, barely-visible trace may remain, with the surrounding skin looking taut and flat. Lift the drooping corners of the mouth so they no longer turn downward — give the mouth naturally neutral or slightly upturned corners instead of a sad/sagging look. Completely eliminate the vertical wrinkles/creases in the skin just in front of both ears (pre-auricular area) on both sides — that skin must end up perfectly smooth and taut, with no visible vertical lines at all, as if firmly pulled upward and backward along the lifting vector. Make the cheeks and mid-face noticeably firmer, fuller, and lifted, with a more defined, youthful jawline-to-cheek contour. Keep the person's identity, facial proportions, skin tone, hairstyle, eye shape, nose shape, background, lighting, and camera angle exactly the same. Do not add makeup, do not change apparent age drastically elsewhere, do not alter eye or nose shape. IMPORTANT, check this specifically before finishing: look closely at the skin directly in front of each ear (between the ear and the edge of the cheek/jaw) — if there is ANY vertical line, crease, or wrinkle there on either side, you MUST remove it completely so that patch of skin is fully smooth with zero visible lines; this is a required, non-negotiable part of the edit, not optional. The improvement should be clearly noticeable at a glance (this is meant to impress a prospective patient), while still looking like a real photograph of the same person — not exaggerated to the point of looking distorted, plastic, or cartoonish.",
  left:
    "This is a medical face-lift consultation simulation photo (left 45-degree profile). Edit this portrait to show a clearly visible, dramatic — but still photorealistic — result of a surgical face lift: completely eliminate ALL sagging, loose, or hanging skin along the entire jaw-to-neck border — under the chin, along the jawline, and especially where the jaw meets the neck just below and behind the earlobe (a common spot where loose skin remains) — leaving that whole area smooth and taut with no residual fold, fat pad, or drooping skin anywhere along that line. The skin and soft tissue directly under the chin must look visibly pulled UPWARD toward the chin bone and backward toward the ear — not just smoothed in place. There should be a clear, visible gap/shadow of tightened skin under the jawbone where loose tissue used to hang, and the horizontal distance between the chin point and the neck should look shorter and tighter, as if a physical upward lifting force was applied. Tighten the jawline into a sharp, continuous, well-defined line from ear to chin, and create a clean, youthful angle where the jawline meets the neck (no double-chin, no loose neck skin, no jowl). Keep the person's identity, facial proportions, skin tone, hairstyle, expression, background, lighting, and camera angle exactly the same. Do not alter eye, nose, or mouth shape. The improvement should be clearly noticeable at a glance (this is meant to impress a prospective patient), while still looking like a real photograph of the same person — not exaggerated to the point of looking distorted, plastic, or cartoonish.",
  right:
    "This is a medical face-lift consultation simulation photo (right 45-degree profile). Edit this portrait to show a clearly visible, dramatic — but still photorealistic — result of a surgical face lift: completely eliminate ALL sagging, loose, or hanging skin along the entire jaw-to-neck border — under the chin, along the jawline, and especially where the jaw meets the neck just below and behind the earlobe (a common spot where loose skin remains) — leaving that whole area smooth and taut with no residual fold, fat pad, or drooping skin anywhere along that line. The skin and soft tissue directly under the chin must look visibly pulled UPWARD toward the chin bone and backward toward the ear — not just smoothed in place. There should be a clear, visible gap/shadow of tightened skin under the jawbone where loose tissue used to hang, and the horizontal distance between the chin point and the neck should look shorter and tighter, as if a physical upward lifting force was applied. Tighten the jawline into a sharp, continuous, well-defined line from ear to chin, and create a clean, youthful angle where the jawline meets the neck (no double-chin, no loose neck skin, no jowl). Keep the person's identity, facial proportions, skin tone, hairstyle, expression, background, lighting, and camera angle exactly the same. Do not alter eye, nose, or mouth shape. The improvement should be clearly noticeable at a glance (this is meant to impress a prospective patient), while still looking like a real photograph of the same person — not exaggerated to the point of looking distorted, plastic, or cartoonish.",
};

export type GenerateResult = { ok: true; image: string } | { ok: false; error: string };

/** data:image/jpeg;base64,xxxx 형태의 문자열을 mimeType/base64로 분리한다. */
function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function generateFaceLiftPreview(dataUrl: string, angle: SimulationAngle): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI 이미지 생성이 설정되어 있지 않습니다. (GEMINI_API_KEY 미설정)" };
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return { ok: false, error: "이미지 형식을 읽을 수 없습니다." };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPTS[angle] },
              { inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `AI 이미지 생성 요청이 실패했습니다. (${res.status}) ${detail.slice(0, 200)}` };
    }

    const data = await res.json();
    const parts: Array<Record<string, unknown>> = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData || p.inline_data) as
      | { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }
      | undefined;
    const inline = imagePart?.inlineData ?? imagePart?.inline_data;
    const base64 = inline && "data" in inline ? inline.data : undefined;
    if (!base64) {
      return { ok: false, error: "AI가 이미지를 생성하지 못했습니다. 다른 사진으로 다시 시도해주세요." };
    }
    const outMime =
      (inline as { mimeType?: string })?.mimeType ?? (inline as { mime_type?: string })?.mime_type ?? "image/png";
    return { ok: true, image: `data:${outMime};base64,${base64}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `AI 이미지 생성 중 오류가 발생했습니다. (${err.message})` : "AI 이미지 생성 중 오류가 발생했습니다.",
    };
  }
}

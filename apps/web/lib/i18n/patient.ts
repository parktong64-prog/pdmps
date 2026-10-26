// 환자용 화면(홈·상담 안내·진행 과정·예약 캘린더·결제)의 문구.
// 한국어(ko)는 기존 화면 그대로이고, 영어(en)는 /en 주소로 들어오는 해외 환자용이다.

export type Lang = "ko" | "en";

/** 영어 화면은 /en 아래에 둔다. 한국어 주소는 그대로. */
export function localePath(lang: Lang, path: string) {
  if (lang !== "en") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/** 영어 예약금 (달러). 원화 예약금은 DB(procedures.deposit_amount)에서 읽는다. */
export const EN_DEPOSIT_USD = 200;
/** 영어 예약에서 결제가 안 될 때 안내하는 문의 이메일 */
export const EN_HELP_EMAIL = "pspdm0308@naver.com";

export const TEXT = {
  ko: {
    brand: "PDMPS",
    // 홈
    homeGuideTitle: "Face Lift 안내",
    homeProductName: "Face Lift (안면거상술)",
    homeVat: "VAT 포함",
    homeForWhom: "이런 분께 추천해요",
    homeCardTitle: "안면거상술",
    homeCardBody:
      "나이가 들면서 볼과 중안면부가 아래로 처지고, 팔자주름이 깊어지며 턱선이 흐려지고 목 주름도 두드러지게 나타납니다.",
    homeDisclaimer:
      "위 설명은 일반적인 특징 안내이며, 정확한 원인과 개선 방법은 방문 상담에서 원장이 직접 확인 후 안내합니다.",
    homeCta: "상담예약하기",
  },
  en: {
    brand: "PDMPS",
    homeGuideTitle: "Face Lift Guide",
    homeProductName: "Face Lift (Facelift Surgery)",
    homeVat: "VAT included",
    homeForWhom: "Who is it for?",
    homeCardTitle: "Facelift",
    homeCardBody:
      "With age, the cheeks and mid-face sag, the lines around the nose and mouth deepen, the jawline loses definition, and neck lines become more visible.",
    homeDisclaimer:
      "This is a general description. The exact cause and the best approach are confirmed by Dr. Park in person at your consultation.",
    homeCta: "Book a Consultation",
  },
} as const;

export const SITE_EN = {
  name: "PDM Plastic Surgery",
  address: "601 Gangnam-daero, Seocho-gu, Seoul (5F, Celltrion Tower)",
  phone: "+82-2-512-9300",
  website: "https://en.parkdongman.com",
  ceo: "Dongman Park, M.D.",
  eyebrow: "Face Lift Specialist · Dr. Park Dong-man",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

export const ENG = {
  // 상담 안내 영상 화면
  consult: {
    title: "About the Surgery",
    lead:
      "Learn how a facelift is performed before you visit. The exact scope and method are decided by the doctor after your in-person diagnosis.",
    facts: [
      { v: "3–4 hrs", l: "Average duration" },
      { v: "Sedation / local", l: "Anesthesia" },
      { v: "Same-day home", l: "Hospital stay" },
    ],
    notWatched: "You haven't watched the video yet",
    playing: "Playing…",
    watched: "Watched",
    autoMuted: "Playing without sound. Tap the speaker button under the video to turn the sound on.",
    playLabel: "Play the guide video",
    videoMissing: "The English guide video is being prepared. You can continue to the next step.",
    next: "Next · See the Process",
    nextHintNotWatched: "You can continue even if you don't watch the whole video",
    nextHintWatched: "You have finished watching",
    placeholderTitle: "Face Lift Guide Video",
    placeholderBy: "Dr. Park Dong-man",
  },
  // 진행 과정 화면
  steps: {
    title: "The Procedure",
    lead: "See how a facelift is performed, step by step.",
    empty: "No procedure steps are available yet.",
    book: "Book a Consultation",
    stepTitle: "Surgical Procedure",
    next: "Next ›",
    prev: "‹ Previous",
    captions: {
      소독: "Disinfection",
      마취: "Anesthesia",
      절개: "Incision",
      "근막(SMAS) 리프팅": "SMAS Lifting",
      봉합: "Suturing",
      디자인: "Design",
      드레싱: "Dressing",
      "수술 과정": "Surgical Procedure",
    } as Record<string, string>,
  },
  // 예약 캘린더
  schedule: {
    title: "Booking Calendar",
    lead: "Choose a day the clinic has opened, then pick an available time.",
    prev: "Previous month",
    next: "Next month",
    monthLabel: (y: number, m: number) =>
      new Date(y, m, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
    legendOpen: "Available",
    legendClosed: "Closed / Full",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    closedMark: "Full",
    holidayMark: "Off",
    loading: "Loading…",
    footnote: "Based on the schedule opened by the clinic. More dates are opened over time.",
    anotherDate: "‹ Choose another date",
    dayTitle: (m: number, d: number, weekday: string) => `${weekday}, ${monthShort(m)} ${d}`,
    availableTimes: "Dr. Park · Available times",
    timeFull: "Full",
    rowProcedure: "Procedure",
    rowDoctor: "Doctor",
    rowWhen: "Date & time",
    doctor: "Dr. Park Dong-man",
    cta: "Next · Your Information",
    hold: "The time you choose is held for 10 minutes until payment.",
    weekdayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    monthShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    tzNote: "All times are Korea Standard Time (KST, UTC+9).",
  },
  // 예약자 정보 + 결제
  checkout: {
    formEyebrow: "Face Lift Specialist · Dr. Park Dong-man",
    formTitle: "Your Information",
    formLead: "We need your details to take the booking deposit.",
    name: "Full name",
    namePh: "Jane Doe",
    email: "Email",
    emailPh: "name@example.com",
    phone: "Phone (with country code)",
    phonePh: "+1 555 123 4567",
    consentLead: "I agree to the collection and use of my personal information.",
    consentRest:
      "Your details are used only to confirm your booking and contact you, and are kept for the period required by law.",
    privacy: "Privacy Policy",
    terms: "Terms",
    errName: "Please enter your name.",
    errEmail: "Please enter a valid email address.",
    errPhone: "Please enter a valid phone number with country code.",
    errConsent: "Please agree to continue.",
    nextPay: "Next · Pay Deposit",
    backToEdit: "‹ Edit my information",
    payEyebrow: "Booking deposit",
    payTitle: "Please review your booking",
    payLead: "Your booking is confirmed as soon as the payment is completed.",
    rowProcedure: "Procedure",
    rowDoctor: "Doctor",
    rowWhen: "Date & time",
    rowDeposit: "Deposit",
    depositNote: "The deposit is non-refundable regardless of cancellation, changes or no-shows.",
    refundLink: "Refund policy",
    payButton: (usd: number) => `Pay $${usd}`,
    paying: "Opening payment…",
    errBooking: "Something went wrong while booking. Please try again.",
    errPayConfig: "Payment is not set up correctly.",
    errPayGeneric: "Something went wrong with the payment. Please try again later.",
    payHelp: "If the payment still does not go through, please email us your name, phone number and preferred date and time, and we will help you book.",
    orderName: "Face Lift Consultation Deposit",
  },
  success: {
    title: "Your booking is confirmed",
    lead: "Please visit on your booking date to meet Dr. Park.",
    name: "Name",
    phone: "Phone",
    when: "Date & time",
    emailNote: "A confirmation will be sent to your email.",
    changeNote: "Schedules may change due to clinic circumstances. If so, we will contact you separately.",
    another: "Make another booking",
    errTitle: "We couldn't confirm your payment",
    errRetry: "Book again",
    errInvalid: "The payment information is not valid.",
  },
  fail: {
    title: "Your booking was not completed",
    lead: "The payment did not go through.",
    release: "The time we held has been released. You are welcome to try again.",
    retry: "Book again",
    cancelled: "You cancelled the payment.",
    aborted: "A problem occurred during payment.",
    rejected: "The card issuer declined the payment.",
    emailHelp: "Still unable to pay? Please email us your name, phone number and preferred date and time, and we will help you complete your booking.",
  },
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthShort(m: number) {
  return MONTH_SHORT[m] ?? "";
}

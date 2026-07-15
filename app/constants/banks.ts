export interface BankOption {
  label: string; // Thai display name shown in dropdown
  value: string; // SWIFT code stored in Firestore
}

export const THAI_BANKS: BankOption[] = [
  { label: "กสิกรไทย (KBank)", value: "KASITHBK" },
  { label: "ไทยพาณิชย์ (SCB)", value: "SICOTHBK" },
  { label: "กรุงเทพ (BBL)", value: "BKKBTHBK" },
  { label: "กรุงไทย (KTB)", value: "KRTHTHBK" },
  { label: "กรุงศรีอยุธยา (BAY)", value: "AYUDTHBK" },
  { label: "ทหารไทยธนชาต (TTB)", value: "TMBKTHBK" },
  { label: "ออมสิน (GSB)", value: "GSBATHBK" },
  { label: "ธ.ก.ส. (BAAC)", value: "BAABTHBK" },
  { label: "เกียรตินาคินภัทร (KKP)", value: "KKPBTHBK" },
  { label: "แลนด์แอนด์เฮ้าส์ (LHB)", value: "LAHRTHB1" },
  { label: "ซีไอเอ็มบีไทย (CIMB)", value: "UBOBTHBK" },
  { label: "ทิสโก้ (Tisco)", value: "TFPCTHB1" },
  { label: "ยูโอบี (UOB)", value: "UOVBTHBK" },
  { label: "ไทยเครดิต (Thai Credit)", value: "THCETHB1" },
  { label: "อิสลามแห่งประเทศไทย (IBANK)", value: "TIBTTHBK" },
  { label: "ซิตี้แบงก์ (Citibank)", value: "CITITHBX" },
  { label: "สแตนดาร์ดชาร์เตอร์ด (SCBT)", value: "SCBLTHBX" },
];

/**
 * Maps a bank name string returned by AI (e.g. "SCB", "Kasikorn", "กสิกร")
 * to the corresponding SWIFT code. Returns empty string if no match found.
 */
export function matchBankToSwift(aiName: string): string {
  if (!aiName) return "";

  const lower = aiName.toLowerCase().trim();

  const aliases: Record<string, string> = {
    // KBank
    kbank: "KASITHBK",
    kasikorn: "KASITHBK",
    กสิกร: "KASITHBK",
    // SCB
    scb: "SICOTHBK",
    "siam commercial": "SICOTHBK",
    ไทยพาณิชย์: "SICOTHBK",
    // BBL
    bbl: "BKKBTHBK",
    "bangkok bank": "BKKBTHBK",
    กรุงเทพ: "BKKBTHBK",
    // KTB
    ktb: "KRTHTHBK",
    krungthai: "KRTHTHBK",
    กรุงไทย: "KRTHTHBK",
    // BAY
    bay: "AYUDTHBK",
    ayudhya: "AYUDTHBK",
    krungsri: "AYUDTHBK",
    กรุงศรี: "AYUDTHBK",
    // TTB
    ttb: "TMBKTHBK",
    tmb: "TMBKTHBK",
    thanachart: "TMBKTHBK",
    ทหารไทย: "TMBKTHBK",
    ธนชาต: "TMBKTHBK",
    // GSB
    gsb: "GSBATHBK",
    ออมสิน: "GSBATHBK",
    // BAAC
    baac: "BAABTHBK",
    ธกส: "BAABTHBK",
    // KKP
    kkp: "KKPBTHBK",
    kiatnakin: "KKPBTHBK",
    เกียรตินาคิน: "KKPBTHBK",
    // LHB
    lhb: "LAHRTHB1",
    "land and houses": "LAHRTHB1",
    แลนด์แอนด์เฮ้าส์: "LAHRTHB1",
    // CIMB
    cimb: "UBOBTHBK",
    // Tisco
    tisco: "TFPCTHB1",
    ทิสโก้: "TFPCTHB1",
    // UOB
    uob: "UOVBTHBK",
    // Thai Credit
    "thai credit": "THCETHB1",
    ไทยเครดิต: "THCETHB1",
    // IBANK
    ibank: "TIBTTHBK",
    อิสลาม: "TIBTTHBK",
    // Citibank
    citibank: "CITITHBX",
    citi: "CITITHBX",
    // Standard Chartered
    "standard chartered": "SCBLTHBX",
    scbt: "SCBLTHBX",
  };

  for (const [alias, swift] of Object.entries(aliases)) {
    if (lower.includes(alias)) return swift;
  }

  return "";
}

import { supabase } from './db';
import embeddedChunks from './embedded-chunks.json';

interface RawFAQ {
  question: string;
  answer: string;
  category: string;
  keywords?: string[];
  sourceName: string;
  sourceUrl: string;
}

// ─── CURATED FAQs WITH KEYWORD TRIGGER ARRAYS ───────────────────────────────

export const TCET_FAQS: RawFAQ[] = [
  {
    category: 'Process',
    question: 'How can I get admission in TCET?',
    answer: 'Admissions to TCET Mumbai are conducted on merit basis. For Maharashtra state candidates, admissions are processed through the Centralized Admission Process (CAP) rounds conducted by the State Common Entrance Test Cell, Maharashtra, based on MHT-CET scores. For All India candidates, admissions are done through JEE Main scores. The college also reserves 51% seats for Hindi Linguistic Minority candidates and 20% seats under the Institutional/Management Quota, which are managed directly by the college based on merit.',
    keywords: ['admission', 'process', 'apply', 'procedure', 'cap', 'rounds', 'seats', 'entry', 'how to join', 'get in'],
    sourceName: 'Admission Brochure 2025-26',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    category: 'Process',
    question: 'What is the admission process after MHT-CET?',
    answer: 'The process involves:\n1. Online registration on the State CET Cell website.\n2. Document upload and e-verification at a Scrutiny Centre.\n3. Filling of option forms (choice code) specifying TCET and desired branches.\n4. Seat allotment based on merit and category preferences in CAP Rounds 1, 2, and 3.\n5. Reporting to the allotted institute (TCET) to verify original documents and pay academic fees to confirm admission.',
    keywords: ['after cet', 'cet process', 'scrutiny', 'option form', 'choice code', 'allotment', 'reporting', 'cap round'],
    sourceName: 'State CET Cell Admission Portal',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    category: 'Eligibility',
    question: 'What is the eligibility criteria for TCET engineering admission?',
    answer: 'Candidates must have passed 10+2 (HSC) with Physics and Mathematics as compulsory subjects, along with Chemistry or a Vocational subject. A minimum of 45% aggregate marks is required for Open Category (40% for reserved categories like SC/ST/OBC). A valid MHT-CET 2025 or JEE Main 2025 scorecard is mandatory. Maharashtra domicile is required for state quota seats.',
    keywords: ['eligibility', 'eligible', 'criteria', 'qualify', 'requirement', 'minimum marks', '12th', 'hsc', 'qualification'],
    sourceName: 'TCET Admission Eligibility Notice',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    category: 'Fees',
    question: 'What are the fees for IT or Computer Engineering at TCET?',
    answer: 'For the academic year 2025-26, the academic fees for first-year B.E. at TCET Mumbai for the Open Category are:\n- Tuition Fee: ₹1,34,348\n- Development Fee: ₹20,152\n- Total Academic Fee: ₹1,54,500\n- In addition, there is a refundable deposit of ₹5,000 (Library Deposit: ₹2,000, Laboratory Deposit: ₹3,000) payable at the time of admission, making the total payable ₹1,59,500.',
    keywords: ['fee', 'fees', 'cost', 'tuition', 'price', 'kharcha', 'charges', 'amount', 'kitna', 'paisa'],
    sourceName: 'FRA Fee Notification 2025-26',
    sourceUrl: 'https://tcetmumbai.in/fees'
  },
  {
    category: 'Fees',
    question: 'Are there any scholarships or fee waivers available?',
    answer: 'Yes, TCET supports multiple government scholarship schemes:\n1. **TFWS (Tuition Fee Waiver Scheme):** 100% Tuition Fee is waived. Students pay only the Development Fee (₹20,152) + refundable deposits (₹5,000), totaling ₹25,152.\n2. **SC/ST Category:** 100% Tuition and Development Fees are waived.\n3. **OBC/EBC/EWS Categories:** 50% Tuition Fee waiver applies (under Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Scheme).\nThese concessions require submitting valid documents on the MahaDBT portal.',
    keywords: ['scholarship', 'waiver', 'tfws', 'concession', 'discount', 'free', 'mahadbt', 'ebc', 'ews', 'obc fee', 'sc st fee'],
    sourceName: 'TCET Scholarship Cell Notice',
    sourceUrl: 'https://tcetmumbai.in/scholarships'
  },
  {
    category: 'Cutoff',
    question: 'What is the cutoff for Computer Engineering at TCET?',
    answer: 'For the academic year 2024, the closing cutoff percentile for the general open category (GOPENS) in Computer Engineering was 97.05% in MHT-CET. In 2023, the cutoff was 97.37%. Cutoffs for Minority quota and institutional seats are typically lower and depend on the specific merit list of applicants.',
    keywords: ['cutoff', 'percentile', 'marks', 'score', 'closing', 'rank', 'chance', 'comp cutoff', 'cse cutoff'],
    sourceName: 'DTE CAP Round Cutoffs 2024',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    category: 'Cutoff',
    question: 'What is the cutoff for IT branch at TCET?',
    answer: 'For the academic year 2024, the closing cutoff percentile for Information Technology (IT) at TCET under the general open category (GOPENS) was 96.22% in MHT-CET. In 2023, the cutoff was 96.34%. TFWS cutoffs are typically higher, starting above 98.0 percentile.',
    keywords: ['it cutoff', 'information technology cutoff', 'it percentile', 'it branch cutoff'],
    sourceName: 'DTE CAP Round Cutoffs 2024',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    category: 'Documents',
    question: 'What documents are required for engineering admission at TCET?',
    answer: 'The required original documents are:\n1. SSC (10th) & HSC (12th) Marksheets.\n2. MHT-CET or JEE Main Scorecard.\n3. Domicile Certificate or Birth Certificate (proving Maharashtra state status).\n4. Nationality Certificate or School Leaving Certificate stating nationality as Indian.\n5. Aadhar Card & College Leaving Certificate.\n6. For Reserved categories: Caste Certificate, Caste Validity Certificate, and Non-Creamy Layer Certificate.\n7. For Hindi Minority: Self-Declaration Proforma O and Registered Affidavit on ₹100 stamp paper.',
    keywords: ['document', 'documents', 'certificate', 'marksheet', 'affidavit', 'proforma', 'checklist', 'papers', 'kagaz'],
    sourceName: 'TCET Admission Documents Checklist',
    sourceUrl: 'https://tcetmumbai.in/documents'
  },
  {
    category: 'Facilities',
    question: 'Does TCET have hostel facilities?',
    answer: 'Yes, TCET provides hostel accommodations located within walking distance (approx. 1 km) from the main campus. The rooms are designed for 2-3 sharing, featuring wardrobe, bed, desk, Wi-Fi, and 24/7 security. Apartment-style layouts with attached washrooms are also available. Note: There is no in-house mess/canteen facility in the hostels, so students arrange meals outside or at the campus canteen.',
    keywords: ['hostel', 'accommodation', 'stay', 'room', 'living', 'mess', 'residence', 'pg'],
    sourceName: 'Hostel Facilities Handout',
    sourceUrl: 'https://tcetmumbai.in/hostel'
  },
  {
    category: 'Placements',
    question: 'What are the placement statistics for TCET Mumbai?',
    answer: 'TCET has a very active Training & Placement cell. For the B.E. batches, the average package ranges around ₹7 to ₹8 Lakhs per annum (LPA). Top companies recruit from TCET, with highest packages going up to ₹15 to ₹20+ LPA. Major recurring recruiters include Accenture, Cisco, TCS, Capgemini, Tata Technologies, Intel, and others.',
    keywords: ['placement', 'job', 'salary', 'package', 'lpa', 'recruiters', 'companies', 'highest package', 'naukri'],
    sourceName: 'TCET Placement Report 2025',
    sourceUrl: 'https://tcetmumbai.in/placements'
  },
  {
    category: 'Process',
    question: 'What B.E. or B.Tech engineering branches are available at TCET Mumbai?',
    answer: 'TCET offers 10 autonomous undergraduate engineering (B.E. and B.Tech) branches:\n- Computer Engineering: 240 seats\n- Information Technology: 240 seats\n- Electronics & Telecommunication (EXTC): 120 seats\n- AI and Data Science (AI&DS): 120 seats\n- Civil Engineering: 120 seats\n- Mechanical & Mechatronics: 60 seats\n- AI and Machine Learning (AI&ML): 60 seats\n- CSE (Cyber Security): 60 seats\n- Internet of Things (IoT): 60 seats\n- Electronics and Computer Science: 60 seats\nTotal annual intake: 1,140 seats.',
    keywords: ['branch', 'branches', 'stream', 'courses', 'intake', 'seats', 'capacity', 'specialization', 'available branches'],
    sourceName: 'TCET Seat Matrix & Intake Brochure 2025-26',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    category: 'Process',
    question: 'How does the Hindi Linguistic Minority Quota work at TCET?',
    answer: 'TCET is a linguistic minority institute reserving 51% of total seats for Hindi-speaking candidates domiciled in Maharashtra. Applicants must register on the State CET Cell portal and select Minority option. Verification requires proving Hindi as mother tongue on School Leaving Certificate or submitting Proforma O + ₹100 Notarized Affidavit.',
    keywords: ['minority', 'hindi minority', 'linguistic', 'proforma o', 'affidavit', '51%', 'mother tongue', 'hindi quota'],
    sourceName: 'Minority Admission Circular',
    sourceUrl: 'https://tcetmumbai.in/minority'
  },
  {
    category: 'Process',
    question: 'What is the eligibility for Direct Second Year (DSE) Engineering admission?',
    answer: 'Candidates who have passed a 3-year Engineering Diploma recognized by MSBTE or a B.Sc. degree with Mathematics in 12th with a minimum of 45% marks (40% for reserved categories) are eligible for Direct Second Year (DSE) admissions through CAP rounds.',
    keywords: ['dse', 'direct second year', 'diploma', 'lateral entry', 'polytechnic', 'msbte'],
    sourceName: 'DSE Admission Handbook',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    category: 'Contact',
    question: 'How can I contact the TCET Admission office?',
    answer: 'You can reach the TCET Admission Cell through:\n- **Phone:** +91-22-67308000 (Main Office)\n- **Email:** tcet.admission@thakureducation.org\n- **Address:** Thakur College of Engineering & Technology, A-Block, Thakur Village, Kandivali (East), Mumbai - 400101\n- **Office Hours:** Monday to Saturday, 10:00 AM to 5:00 PM\n- **Website:** https://tcetmumbai.in',
    keywords: ['contact', 'phone', 'email', 'address', 'call', 'office', 'helpline', 'number', 'location', 'where'],
    sourceName: 'TCET Contact Information',
    sourceUrl: 'https://tcetmumbai.in/contact'
  },
  {
    category: 'Facilities',
    question: 'What are the library and lab facilities at TCET?',
    answer: 'TCET features a Learning Resource Centre (LRC) with 60,000+ books, digital library with IEEE/ACM access, and a reading hall seating 226 students. The campus has advanced labs including Thakur-Accenture Innovation Centre, TCET-INTEL Centre of Excellence, TCET-CISCO Wireless Lab, and Tata Technologies Centre of Excellence. Students get hands-on experience with industry-grade equipment.',
    keywords: ['library', 'lab', 'labs', 'laboratory', 'facilities', 'infrastructure', 'books', 'centre of excellence'],
    sourceName: 'TCET Infrastructure Manual',
    sourceUrl: 'https://tcetmumbai.in/facilities'
  }
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

export async function seedDatabase() {
  console.log('--- Instant Database Seeding Started ---');

  // 1. Seed FAQs
  console.log('[Seed] Clearing and inserting FAQs...');

  const { error: clearFaqError } = await supabase
    .from('faqs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearFaqError) {
    console.error('[Seed] Error clearing FAQs:', clearFaqError);
  }

  const formattedFAQs = TCET_FAQS.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    keywords: faq.keywords || [],
    source_name: faq.sourceName,
    source_url: faq.sourceUrl
  }));

  const { error: faqError } = await supabase.from('faqs').insert(formattedFAQs);
  if (faqError) {
    console.error('[Seed] Error inserting FAQs:', faqError);
  } else {
    console.log(`[Seed] Successfully seeded ${TCET_FAQS.length} FAQs.`);
  }

  // 2. Seed Pre-computed Document Chunks (0 API calls, 0 timeout risk)
  console.log('[Seed] Clearing and inserting pre-computed static document chunks...');

  const { error: clearDocsError } = await supabase
    .from('document_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearDocsError) {
    console.error('[Seed] Error clearing document_chunks:', clearDocsError);
  }

  const { error: insertError } = await supabase
    .from('document_chunks')
    .insert(embeddedChunks);

  let chunkCount = 0;
  if (insertError) {
    console.error('[Seed] Error inserting document chunks:', insertError);
  } else {
    chunkCount = embeddedChunks.length;
  }

  console.log(`[Seed] Successfully seeded ${chunkCount}/${embeddedChunks.length} document chunks.`);
  console.log('--- Instant Database Seeding Completed ---');
  return { faqsSeeded: TCET_FAQS.length, chunksSeeded: chunkCount };
}

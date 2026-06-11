import { supabase } from './db';
import { generateEmbedding } from './rag';

interface RawChunk {
  title: string;
  content: string;
  sourceName: string;
  sourceUrl: string;
}

interface RawFAQ {
  question: string;
  answer: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
}

// 1. Curated FAQs for TCET Mumbai
export const TCET_FAQS: RawFAQ[] = [
  {
    category: 'Process',
    question: 'How can I get admission in TCET?',
    answer: 'Admissions to TCET Mumbai are conducted on merit basis. For Maharashtra state candidates, admissions are processed through the Centralized Admission Process (CAP) rounds conducted by the State Common Entrance Test Cell, Maharashtra, based on MHT-CET scores. For All India candidates, admissions are done through JEE Main scores. The college also reserves 51% seats for Hindi Linguistic Minority candidates and 20% seats under the Institutional/Management Quota, which are managed directly by the college based on merit.',
    sourceName: 'Admission Brochure 2025-26',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    category: 'Process',
    question: 'What is the admission process after MHT-CET?',
    answer: 'The process involves:\n1. Online registration on the State CET Cell website.\n2. Document upload and e-verification at a Scrutiny Centre.\n3. Filling of option forms (choice code) specifying TCET and desired branches.\n4. Seat allotment based on merit and category preferences in CAP Rounds 1, 2, and 3.\n5. Reporting to the allotted institute (TCET) to verify original documents and pay academic fees to confirm admission.',
    sourceName: 'State CET Cell Admission Portal',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    category: 'Fees',
    question: 'What are the fees for IT or Computer Engineering at TCET?',
    answer: 'For the academic year 2025-26, the academic fees for first-year B.E. at TCET Mumbai for the Open Category are:\n- Tuition Fee: ₹1,34,348\n- Development Fee: ₹20,152\n- Total Academic Fee: ₹1,54,500\n- In addition, there is a refundable deposit of ₹5,000 (Library Deposit: ₹2,000, Laboratory Deposit: ₹3,000) payable at the time of admission, making the total payable ₹1,59,500.',
    sourceName: 'FRA Fee Notification 2025-26',
    sourceUrl: 'https://tcetmumbai.in/fees'
  },
  {
    category: 'Fees',
    question: 'Are there any scholarships or fee waivers available?',
    answer: 'Yes, TCET supports multiple government scholarship schemes:\n1. **TFWS (Tuition Fee Waiver Scheme):** 100% Tuition Fee is waived. Students pay only the Development Fee (₹20,152) + refundable deposits (₹5,000), totaling ₹25,152.\n2. **SC/ST Category:** 100% Tuition and Development Fees are waived.\n3. **OBC/EBC/EWS Categories:** 50% Tuition Fee waiver applies (under Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Scheme).\nThese concessions require submitting valid documents on the MahaDBT portal.',
    sourceName: 'TCET Scholarship Cell Notice',
    sourceUrl: 'https://tcetmumbai.in/scholarships'
  },
  {
    category: 'Cutoff',
    question: 'What is the cutoff for Computer Engineering at TCET?',
    answer: 'For the academic year 2024, the closing cutoff percentile for the general open category (GOPENS) in Computer Engineering was 97.05% in MHT-CET. In 2023, the cutoff was 97.37%. Cutoffs for Minority quota and institutional seats are typically lower and depend on the specific merit list of applicants.',
    sourceName: 'DTE CAP Round Cutoffs 2024',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    category: 'Documents',
    question: 'What documents are required for engineering admission at TCET?',
    answer: 'The required original documents are:\n1. SSC (10th) & HSC (12th) Marksheets.\n2. MHT-CET or JEE Main Scorecard.\n3. Domicile Certificate or Birth Certificate (proving Maharashtra state status).\n4. Nationality Certificate or School Leaving Certificate stating nationality as Indian.\n5. Aadhar Card & College Leaving Certificate.\n6. For Reserved categories: Caste Certificate, Caste Validity Certificate, and Non-Creamy Layer Certificate.\n7. For Hindi Minority: Self-Declaration Proforma O and Registered Affidavit on ₹100 stamp paper.',
    sourceName: 'TCET Admission Documents Checklist',
    sourceUrl: 'https://tcetmumbai.in/documents'
  },
  {
    category: 'Facilities',
    question: 'Does TCET have hostel facilities?',
    answer: 'Yes, TCET provides hostel accommodations located within walking distance (approx. 1 km) from the main campus. The rooms are designed for 2-3 sharing, featuring wardrobe, bed, desk, Wi-Fi, and 24/7 security. Apartment-style layouts with attached washrooms are also available. Note: There is no in-house mess/canteen facility in the hostels, so students arrange meals outside or at the campus canteen.',
    sourceName: 'Hostel Facilities Handout',
    sourceUrl: 'https://tcetmumbai.in/hostel'
  },
  {
    category: 'Placements',
    question: 'What are the placement statistics for TCET Mumbai?',
    answer: 'TCET has a very active Training & Placement cell. For the B.E. batches, the average package ranges around ₹7 to ₹8 Lakhs per annum (LPA). Top companies recruit from TCET, with highest packages going up to ₹15 to ₹20+ LPA. Major recurring recruiters include Accenture, Cisco, TCS, Capgemini, Tata Technologies, Intel, and others.',
    sourceName: 'TCET Placement Report 2025',
    sourceUrl: 'https://tcetmumbai.in/placements'
  },
  {
    category: 'Process',
    question: 'What B.E. or B.Tech engineering branches are available at TCET Mumbai?',
    answer: 'Thakur College of Engineering and Technology (TCET) offers 10 autonomous undergraduate engineering (B.E. and B.Tech) branches with the following annual seat intakes:\n- Computer Engineering: 240 seats\n- Information Technology: 240 seats\n- Electronics & Telecommunication Engineering (EXTC): 120 seats\n- Artificial Intelligence and Data Science (AI&DS): 120 seats\n- Civil Engineering: 120 seats\n- Mechanical & Mechatronics Engineering: 60 seats\n- Artificial Intelligence and Machine Learning (AI&ML): 60 seats\n- Computer Science and Engineering (Cyber Security): 60 seats\n- Internet of Things (IoT): 60 seats\n- Electronics and Computer Science: 60 seats\nAll programs are approved by AICTE and affiliated with the University of Mumbai, with a total annual intake of 1,140 seats.',
    sourceName: 'TCET Seat Matrix & Intake Brochure 2025-26',
    sourceUrl: 'https://tcetmumbai.in/admission'
  }
];

// 2. Document Chunks representing the detailed official notices
export const TCET_DOCUMENT_CHUNKS: RawChunk[] = [
  {
    title: 'Admissions Eligibility & Quota Seat Distribution',
    content: 'Thakur College of Engineering and Technology (TCET), Mumbai is an autonomous private institute. Seat distribution for undergraduate engineering B.E. courses is divided as: 51% of the total intake is reserved for the Hindi Linguistic Minority Quota (Maharashtra candidates whose mother tongue is Hindi), 29% seats are allocated through the Centralized Admission Process (CAP) of the State CET Cell, and 20% seats are filled via the Institutional/Management Quota based on merit. General Eligibility requires passing 10+2 (HSC) with Physics and Mathematics as compulsory subjects, plus Chemistry/Vocational subjects, securing a minimum of 45% aggregate marks (40% for reserved categories). Candidates must possess a valid scorecard for MHT-CET 2025 or JEE Main 2025.',
    sourceName: 'TCET General Information Brochure Sec 1.1',
    sourceUrl: 'https://tcetmumbai.in/admission'
  },
  {
    title: 'Detailed Fee Structure 2025-26 & Refundable Deposits',
    content: 'As approved by the Fee Regulating Authority (FRA) of Maharashtra, the fee structure for first-year B.E. (B.Tech) engineering courses at TCET Mumbai for Academic Year 2025-26 comprises:\n- Tuition Fee: ₹1,34,348\n- Development Fee: ₹20,152\n- Total Academic Fee: ₹1,54,500\nAt the time of admission, students must also pay refundable deposits: Library Deposit of ₹2,000 and Laboratory Deposit of ₹3,000, bringing the initial payable amount for Open Category to ₹1,59,500. Under the Tuition Fee Waiver Scheme (TFWS), the tuition fee of ₹1,34,348 is 100% exempted; TFWS students pay only the Development Fee (₹20,152) and the deposits (₹5,000), totaling ₹25,152.',
    sourceName: 'TCET Office Circular Ref No: TCET/ADM/FEES/2025-01',
    sourceUrl: 'https://tcetmumbai.in/fees'
  },
  {
    title: 'Category Concessions & MahaDBT Scholarship Rules',
    content: 'Students belonging to reserved categories can claim fee concessions under Maharashtra government schemes. SC and ST category candidates are eligible for a 100% waiver on both Tuition and Development fees, meaning they pay only the refundable deposits of ₹5,000. OBC candidates admitted through CAP rounds are eligible for a 50% waiver on the Tuition Fee. Economically Weaker Section (EWS) and Economically Backward Class (EBC) candidates with a family income below ₹8 Lakhs per annum also receive a 50% Tuition Fee waiver. Concessions are disbursed as scholarships through the MahaDBT portal, and candidates must submit Income Certificate, Domicile, and Caste documents during CAP registration to qualify.',
    sourceName: 'Scholarship Notice 2025',
    sourceUrl: 'https://tcetmumbai.in/scholarships'
  },
  {
    title: 'Historical MHT-CET Cutoff Percentiles (2023 and 2024)',
    content: 'The closing cutoff percentiles for first-year B.E. admissions at TCET Mumbai through CAP rounds (General Open Category - GOPENS) are as follows:\n- Computer Engineering: 97.05 percentile (2024) | 97.37 percentile (2023)\n- Information Technology: 96.22 percentile (2024) | 96.34 percentile (2023)\n- Artificial Intelligence and Data Science (AI&DS): 95.80 percentile (2024) | 95.90 percentile (2023)\n- Artificial Intelligence and Machine Learning (AI&ML): 95.40 percentile (2024)\n- Electronics & Telecommunication (EXTC): 93.87 percentile (2024) | 92.90 percentile (2023)\n- Mechanical & Mechatronics Engineering: 81.20 percentile (2024)\n- Civil Engineering: 78.50 percentile (2024)\nCutoffs for TFWS are generally higher, starting above 98.0 percentile. Minority and institutional cutoffs fluctuate based on yearly application merit.',
    sourceName: 'State CET Cell Cutoff Compilations',
    sourceUrl: 'https://cetcell.mahacet.org/'
  },
  {
    title: 'Hindi Linguistic Minority Quota Admission Requirements',
    content: 'To apply under the 51% Hindi Linguistic Minority Quota at TCET Mumbai, candidates must satisfy the following conditions:\n1. Must be a resident/domiciled in the State of Maharashtra.\n2. Mother tongue must be Hindi, as documented in their School Leaving Certificate (L.C.).\n3. If mother tongue is not mentioned in L.C., they must submit a registered Self-Declaration (Proforma O) along with an affidavit registered before a Notary Public on ₹100 stamp paper stating the candidate belongs to the Hindi Linguistic Minority community. Minority admissions are filled based on MHT-CET/JEE merit scores through the CAP rounds or directly via college-level rounds.',
    sourceName: 'Linguistic Minority Admission Guidelines',
    sourceUrl: 'https://tcetmumbai.in/minority'
  },
  {
    title: 'Campus Hostels, Security, Wi-Fi & Mess Information',
    content: 'TCET Mumbai offers separate hostel accommodations for boys and girls. The hostels are situated approximately 1 km away from the main college campus in Kandivali. Rooms are spacious and furnished, typically shared by 2 or 3 students. Basic hostel features include 24/7 biometric security access, CCTV surveillance, continuous water supply, hot water facilities, wardrobes, studies, and high-speed Wi-Fi. A critical notice for parents: The hosteling system does not feature an in-house mess or meal preparation service. Students generally dine at the campus canteen during college hours, or subscribe to independent local tiffin services (mess providers) nearby.',
    sourceName: 'TCET Infrastructure Manual Page 14',
    sourceUrl: 'https://tcetmumbai.in/hostel'
  },
  {
    title: 'Learning Resource Centre (Library) Architecture & Hours',
    content: 'TCET library, designated as the Learning Resource Centre (LRC), is located on the 4th floor of the campus. It holds a robust collection of over 60,000 books and a reference section featuring 2,000+ handbooks. The library features a general reading hall that seats 226 students, and a dedicated, air-conditioned reading room for faculty with 23 seats. A digital library section offers 24 PCs connected to a 1000 Mbps high-speed internet LAN for accessing online journals (IEEE, ACM) and e-resources. Additionally, the library offers a book bank scheme where students can borrow textbook sets for the entire semester. The library operates from 8:00 AM to 8:00 PM on working days, extending hours during examinations.',
    sourceName: 'TCET LRC Factsheet 2025',
    sourceUrl: 'https://tcetmumbai.in/library'
  },
  {
    title: 'Departmental Laboratories & Specialized Centres of Excellence',
    content: 'TCET features highly advanced laboratory spaces across its 11 departments. Prominent facilities include the Computing & System Design Lab, Multimedia System Design & Development Lab, and Language Lab for communication skills. The college houses multiple high-end Centres of Excellence in collaboration with industry partners: the Thakur-Accenture Innovation Centre, TCET-INTEL Centre of Excellence, TCET-CISCO Wireless Network Laboratory, Thakur TATA Technologies Centre of Excellence, and TCET-Embedded System Lab utilizing Texas Instruments hardware. These labs allow students to work on practical engineering projects and obtain professional certifications.',
    sourceName: 'Academic Facilities & Laboratories Register',
    sourceUrl: 'https://tcetmumbai.in/labs'
  },
  {
    title: 'Training & Placement Cell, Salaries & Recruiters',
    content: 'TCET Mumbai maintains a dedicated Training & Placement Cell that assists students in securing internships and career opportunities. For the engineering batches, TCET reports a consistent placement rate with an average package of ₹7.0 to ₹8.0 LPA. The highest package in recent years has reached up to ₹15 to ₹20+ LPA. Major recruiting companies visiting the campus include Accenture, Cisco Systems, Intel, TCS, Capgemini, Infosys, and Tata Technologies. Students are eligible for campus placements from Semester VII, provided they maintain an aggregate CGPA of 6.0+ and clear aptitude trainings organized by the cell.',
    sourceName: 'TCET Placements & Statistics 2025',
    sourceUrl: 'https://tcetmumbai.in/placements'
  },
  {
    title: 'Autonomous Engineering Syllabus & Course Structure',
    content: 'Under autonomy (CBCGS-HME Scheme), TCET first-year engineering B.E. (B.Tech) semesters are common to all branches. Semester I subjects include Engineering Mathematics-I, Engineering Physics-I, Engineering Chemistry-I, Basic Electrical Engineering, and Basic Workshop Practice. Semester II covers Engineering Mathematics-II, Engineering Physics-II, Engineering Mechanics, Programming in C/Python, and Basic Engineering Drawing. Autonomy allows TCET to offer credit weightage for Professional/Life Skills (Logic building, Aptitude) and Activity-Based Learning (Society Outreach, Yoga). From Semester III onwards, branches study specialized departmental subjects with mandatory summer internship credits.',
    sourceName: 'TCET Scheme & Syllabus under Autonomy',
    sourceUrl: 'https://tcetmumbai.in/syllabus'
  },
  {
    title: 'TCET B.E. & B.Tech Engineering Branches and Seat Intake Matrix',
    content: 'Thakur College of Engineering and Technology (TCET), Mumbai, offers undergraduate engineering courses (B.E./B.Tech) with the following branch-wise seat intakes:\n- Computer Engineering: 240 seats\n- Information Technology: 240 seats\n- Electronics & Telecommunication Engineering (EXTC): 120 seats\n- Artificial Intelligence and Data Science (AI&DS): 120 seats\n- Civil Engineering: 120 seats\n- Mechanical & Mechatronics Engineering: 60 seats\n- Artificial Intelligence and Machine Learning (AI&ML): 60 seats\n- Computer Science and Engineering (Cyber Security): 60 seats\n- Internet of Things (IoT): 60 seats\n- Electronics and Computer Science: 60 seats\nTotal undergraduate intake capacity across all B.E. and B.Tech courses is 1,140 seats per year. Admissions to all these branches are governed by the State CET Cell (CAP rounds) and college-level minority/institutional quotas.',
    sourceName: 'Official TCET Seat Distribution Circular',
    sourceUrl: 'https://tcetmumbai.in/admission'
  }
];

/**
 * Seed function to populate Supabase database with the above data.
 */
export async function seedDatabase() {
  console.log('--- Database Seeding Started ---');

  // 1. Seed FAQs
  console.log('Seeding FAQs...');
  
  // Clear existing FAQs
  const { error: clearFaqError } = await supabase.from('faqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearFaqError) {
    console.error('Error clearing FAQs table:', clearFaqError);
  }

  const formattedFAQs = TCET_FAQS.map(faq => ({
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    source_name: faq.sourceName,
    source_url: faq.sourceUrl
  }));

  const { data: faqData, error: faqError } = await supabase
    .from('faqs')
    .insert(formattedFAQs);

  if (faqError) {
    console.error('Error inserting FAQs:', faqError);
  } else {
    console.log(`Successfully seeded ${TCET_FAQS.length} FAQs.`);
  }

  // 2. Seed Document Chunks (RAG vectors)
  console.log('Seeding Document Chunks (with embeddings)...');
  
  // Clear existing Chunks
  const { error: clearDocsError } = await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearDocsError) {
    console.error('Error clearing document_chunks table:', clearDocsError);
  }

  let chunkCount = 0;
  for (const chunk of TCET_DOCUMENT_CHUNKS) {
    try {
      console.log(`Generating embedding for: "${chunk.title}"`);
      const embedding = await generateEmbedding(chunk.content);
      
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert({
          title: chunk.title,
          content: chunk.content,
          source_name: chunk.sourceName,
          source_url: chunk.sourceUrl,
          embedding: embedding // Supabase client handles arrays for postgres vector
        });

      if (insertError) {
        console.error(`Error inserting chunk "${chunk.title}":`, insertError);
      } else {
        chunkCount++;
      }
    } catch (err) {
      console.error(`Failed to process chunk "${chunk.title}":`, err);
    }
  }

  console.log(`Successfully seeded ${chunkCount}/${TCET_DOCUMENT_CHUNKS.length} document chunks.`);
  console.log('--- Database Seeding Completed ---');
  return { faqsSeeded: TCET_FAQS.length, chunksSeeded: chunkCount };
}

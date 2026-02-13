// lib/faqData.js
// Centralized FAQ content for NIEMR portals.

const ROLE_LABELS = {
  SUPER_ADMIN: "Facility Super Admin",
  ADMIN: "Facility Admin",
  FRONTDESK: "Front Desk",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB: "Lab Scientist",
  PHARMACY: "Pharmacist",
  PATIENT: "Patient",
};

function makeId(prefix, i) {
  return `${prefix}-${i}`;
}

function cat(id, title, description, items) {
  return { id, title, description, items };
}

function qa(prefix, qas) {
  return qas.map((x, idx) => ({ id: makeId(prefix, idx + 1), ...x }));
}

export function roleLabel(role) {
  const key = String(role || "").toUpperCase();
  return ROLE_LABELS[key] || role || "";
}

/**
 * PATIENT FAQ
 */
export function getPatientFaq() {
  const gettingStarted = qa("pt-start", [
    {
      question: "What is NIEMR and what can I do here?",
      answer:
        "NIEMR is your health portal for managing appointments, lab/imaging requests, prescriptions, billing and your medical documents. From your Patient Dashboard, you can book appointments, view results, pay bills (when applicable), and keep your records in one place.",
      tags: ["overview", "dashboard"],
    },
    {
      question: "How do I sign in (and why do I have a dedicated Patient login)?",
      answer:
        "Use the Patient Login page only. NIEMR separates access for Patients, Facility Staff and Independent Providers. If you try to sign in on the wrong portal, you’ll be blocked for security.",
      tags: ["login", "security"],
    },
    {
      question: "I forgot my password. What should I do?",
      answer:
        "Use the “Forgot password” option on the login screen. If you don’t receive a reset email, check your spam folder and confirm your email address is correct.",
      tags: ["password"],
    },
    {
      question: "How do I update my profile details?",
      answer:
        "Open your profile/settings area and update fields like phone, address, and other personal info. Always keep your contact details accurate so facilities can reach you.",
      tags: ["profile"],
    },
    {
      question: "How do Notifications work?",
      answer:
        "Notifications inform you about appointment updates, results availability, billing updates, and messages from facilities. Use the bell icon or the Notifications page to review them.",
      tags: ["notifications"],
    },
  ]);

  const appointments = qa("pt-appt", [
    {
      question: "How do I book an appointment?",
      answer:
        "Go to Appointments → New (or use “Book Appointment” on your dashboard). Choose the facility/provider, pick a date/time, then confirm. You’ll see the booking in your Appointments list.",
      tags: ["appointments"],
    },
    {
      question: "Can I book with an independent provider (solo doctor/lab/pharmacy)?",
      answer:
        "Yes—when booking, select the provider option where available. If a service is offered by an independent provider (e.g., lab tests), you can choose them instead of a facility.",
      tags: ["appointments", "providers"],
    },
    {
      question: "How do I reschedule or cancel an appointment?",
      answer:
        "Open the appointment from your Appointments list. If reschedule/cancel is available, use the action button. Some facilities may require confirmation before changes take effect.",
      tags: ["appointments"],
    },
    {
      question: "Where can I see my appointment details?",
      answer:
        "Go to Appointments and open any appointment card. You’ll see the date/time, provider/facility, status, and any instructions.",
      tags: ["appointments"],
    },
    {
      question: "Why is my appointment status “Pending/Checked-in/Completed”?",
      answer:
        "Statuses track your visit journey. Pending means scheduled, Checked-in means you’ve arrived and the facility has started processing your visit, Completed means the visit has been concluded.",
      tags: ["appointments"],
    },
  ]);

  const labsImaging = qa("pt-labs", [
    {
      question: "Where do I see my lab orders and results?",
      answer:
        "Go to Labs. Each order shows its status. Open an order to view completed results and any attachments (like PDFs or images).",
      tags: ["labs"],
    },
    {
      question: "How do I view imaging tests and reports?",
      answer:
        "Go to Imaging. Open a test to see details, status, and attachments uploaded by the facility/provider.",
      tags: ["imaging"],
    },
    {
      question: "Why don’t I see a result yet?",
      answer:
        "If the lab/imaging status is still in progress, results may not be published yet. You’ll see the result when the facility/provider marks it completed and uploads the report.",
      tags: ["labs", "imaging"],
    },
    {
      question: "Can I download my lab/imaging attachments?",
      answer:
        "Yes. When a report or file is attached, open the item and use the download/view option for the attachment.",
      tags: ["attachments"],
    },
    {
      question: "What should I do if a lab order looks wrong?",
      answer:
        "Open the order details and confirm the test name and facility/provider. If it’s incorrect, contact the facility/provider that created the order so they can correct it.",
      tags: ["labs"],
    },
  ]);

  const pharmacy = qa("pt-pharm", [
    {
      question: "Where do I see my prescriptions?",
      answer:
        "Go to Pharmacy to view prescriptions created for you. Open a prescription to see dosage instructions and dispensing status.",
      tags: ["pharmacy"],
    },
    {
      question: "Can I see which facility or independent pharmacy dispensed a drug?",
      answer:
        "Yes. Your medication/prescription history shows where the item was prescribed or dispensed (facility or independent provider), depending on the record.",
      tags: ["pharmacy"],
    },
    {
      question: "How do I handle medication issues (wrong dosage, allergy concerns)?",
      answer:
        "Do not self-adjust medication. Contact the prescribing doctor or the dispensing pharmacy immediately. If you have allergies, ensure they are recorded in your Allergies section.",
      tags: ["safety", "pharmacy"],
    },
    {
      question: "What is the Allergies section used for?",
      answer:
        "Allergies help clinicians avoid prescribing medications or treatments that could harm you. Keep your allergies updated and accurate.",
      tags: ["allergies"],
    },
    {
      question: "Why can’t I request certain drugs directly?",
      answer:
        "Some drugs require a valid prescription or clinician approval. NIEMR enforces safer medication workflows.",
      tags: ["pharmacy", "safety"],
    },
  ]);

  const billingHmo = qa("pt-billing", [
    {
      question: "Where do I see my bills and payments?",
      answer:
        "Go to Billing to view charges and what’s outstanding (when it applies to you). Go to Payments to view what you have paid and your receipts.",
      tags: ["billing", "payments"],
    },
    {
      question: "How does HMO/insurance affect what I see?",
      answer:
        "If a bill is covered by an HMO/insurance, you may not be responsible for paying it directly. Your billing screen focuses on patient-pay items and shows insurance-related details when relevant.",
      tags: ["hmo", "insurance"],
    },
    {
      question: "How do I attach or detach an HMO from my profile?",
      answer:
        "Go to HMO on your portal to view or manage your attached insurance (where enabled). If you can’t modify it, contact your facility admin to assist.",
      tags: ["hmo"],
    },
    {
      question: "Why does a bill show as “Outstanding”?",
      answer:
        "Outstanding means payment hasn’t been recorded yet for that charge. If you already paid outside the portal, contact the facility so they can record the payment correctly.",
      tags: ["billing"],
    },
    {
      question: "Can I download receipts?",
      answer:
        "If a receipt or payment record is available, open the payment entry to view details. For official receipts, contact the facility billing desk if needed.",
      tags: ["payments"],
    },
  ]);

  const records = qa("pt-records", [
    {
      question: "Where can I see my visit/encounter history?",
      answer:
        "Go to Encounters (or “My Visits” on your dashboard) to see your clinical history recorded in NIEMR.",
      tags: ["encounters"],
    },
    {
      question: "Where do my uploaded documents go?",
      answer:
        "Go to Documents. You’ll see your general uploads and any files attached to encounters, lab results, or imaging reports (where mirrored to your document vault).",
      tags: ["documents"],
    },
    {
      question: "Can I manage dependents (children/family) under my account?",
      answer:
        "Yes. Go to Dependents to create and manage dependent profiles, then book appointments for them (where enabled).",
      tags: ["dependents"],
    },
    {
      question: "How is my privacy protected?",
      answer:
        "Your data is protected by role-based access. Facility staff and providers only see what they need to provide care. Always log out on shared devices.",
      tags: ["privacy", "security"],
    },
    {
      question: "Why am I seeing “You do not have permission”?",
      answer:
        "That usually means you’re on the wrong portal, you don’t own that record, or your session expired. Confirm you’re logged in as a Patient and try again.",
      tags: ["permissions", "troubleshooting"],
    },
  ]);

  return {
    title: "Patient Help & FAQ",
    subtitle: "Answers to common questions about using NIEMR as a patient.",
    portalLabel: "Patient portal",
    backHref: "/patient",
    roleLabel: ROLE_LABELS.PATIENT,
    categories: [
      cat(
        "getting-started",
        "Getting started",
        "Logging in, navigation and basics.",
        gettingStarted
      ),
      cat("appointments", "Appointments", "Booking and managing visits.", appointments),
      cat("labs-imaging", "Labs & Imaging", "Viewing tests, results and reports.", labsImaging),
      cat("pharmacy", "Pharmacy", "Prescriptions and medication history.", pharmacy),
      cat("billing", "Billing & HMO", "Charges, payments and insurance.", billingHmo),
      cat("records", "Records & privacy", "Documents, encounters and access control.", records),
    ],
  };
}

/**
 * FACILITY FAQ (role-aware)
 */
export function getFacilityFaq(role) {
  const r = String(role || "").toUpperCase();

  const common = qa("fx-common", [
    {
      question: "What is the Facility portal used for?",
      answer:
        "The Facility portal is where facility staff manage patient visits, appointments, clinical workflows (encounters, vitals), lab/imaging requests, prescriptions, billing, and operations — based on your assigned role.",
      tags: ["overview"],
    },
    {
      question: "How do I know which role I’m logged in as?",
      answer:
        "Your dashboard header and quick actions change based on your role (e.g., Doctor, Nurse, Lab, Pharmacy, Front Desk, Admin). If your role looks wrong, contact the facility admin.",
      tags: ["roles"],
    },
    {
      question: "Why can’t I log in on the Provider or Patient portal?",
      answer:
        "NIEMR enforces strict portal boundaries. Facility staff must use the Facility login; independent providers use the Provider login; patients use the Patient login.",
      tags: ["login", "security"],
    },
    {
      question: "How do I find a patient quickly?",
      answer:
        "Use the Patients page and search by name/phone/ID. You can also navigate from an appointment or encounter to a patient profile.",
      tags: ["patients", "search"],
    },
    {
      question: "Where do I see today’s appointments?",
      answer:
        "Use Appointments. Your dashboard may also show upcoming rows and live counts depending on your role.",
      tags: ["appointments"],
    },
    {
      question: "How do notifications work for facility staff?",
      answer:
        "Notifications are used for system updates, operational announcements, and workflow alerts (like results ready). Always review notifications at the start of your shift.",
      tags: ["notifications"],
    },
    {
      question: "Can I upload documents for a patient?",
      answer:
        "Yes, where your role permits. Documents can be uploaded from the patient record or attached during workflows like encounters and lab results.",
      tags: ["documents"],
    },
    {
      question: "What does “permission denied” mean in the facility portal?",
      answer:
        "It usually means you’re trying to access a record outside your scope (e.g., wrong facility, wrong module permissions, or you’re not assigned to that action). Contact your admin if you think it’s a mistake.",
      tags: ["permissions"],
    },
    {
      question: "How do I log out safely?",
      answer:
        "Use the Logout button in the app header. Always log out on shared workstations.",
      tags: ["security"],
    },
    {
      question: "How does audit/history help the facility?",
      answer:
        "Audit logs help track actions (creation, updates, approvals) across modules for accountability and compliance. Admins may have more visibility than staff.",
      tags: ["audit"],
    },
    {
      question: "Where do I see billing and payments?",
      answer:
        "Billing shows charges, and Payments shows recorded payments/receipts. Access depends on your role (admins/front desk often have broader access).",
      tags: ["billing", "payments"],
    },
    {
      question: "How do facility wards and beds work in NIEMR?",
      answer:
        "If your facility uses wards, the Wards module tracks bed assignment and history. Only roles with access can create/modify bed assignments.",
      tags: ["wards"],
    },
    {
      question: "How do I generate reports?",
      answer:
        "Use the Reports section (where available). Reports can include appointments, revenue, and operational summaries, depending on your permissions.",
      tags: ["reports"],
    },
    {
      question: "What should I do if the dashboard numbers look wrong?",
      answer:
        "First refresh the page. If it persists, confirm the date filters (if any) and check if you are viewing the correct facility workspace. Admins can verify data in reports.",
      tags: ["dashboard", "troubleshooting"],
    },
    {
      question: "How do I contact NIEMR support?",
      answer:
        "Start by reporting to niemr.ai@outlook.com. They can escalate to the NIEMR support team with screenshots and the record IDs involved.",
      tags: ["support"],
    },
    {
      question: "Can I change my password?",
      answer:
        "Use the password reset flow (“Forgot password”) or your settings if available. For staff accounts, admins can also help confirm your email and reset access.",
      tags: ["password"],
    },
  ]);

  const adminOwner = qa("fx-admin", [
    {
      question: "How do I add or manage facility staff accounts?",
      answer:
        "Go to Admins/Staff management. Create staff accounts with the correct role (Front Desk, Doctor, Nurse, Lab, Pharmacy) and confirm they can log in via the Facility portal.",
      tags: ["admin"],
    },
    {
      question: "How do permissions and roles work?",
      answer:
        "Roles determine which modules a staff member can access and what actions they can perform (create/edit/dispense/record payments). Assign the least access needed for the job.",
      tags: ["admin", "permissions"],
    },
    {
      question: "How do I manage provider onboarding/approvals?",
      answer:
        "Use the Providers section to review facility-linked providers and operational relationships. Approvals and rejection flows depend on your organisation setup.",
      tags: ["providers"],
    },
    {
      question: "How do I manage HMO configurations?",
      answer:
        "Go to HMOs to enable/disable, configure coverage details, and confirm how billing behaves for insured vs uninsured patients.",
      tags: ["hmo", "billing"],
    },
    {
      question: "How do I handle dispute cases or data corrections?",
      answer:
        "Use audit logs to trace actions. For clinical records, follow your facility policy (e.g., addendum notes rather than deleting). For billing, record adjustments with clear notes.",
      tags: ["audit", "compliance"],
    },
    {
      question: "How do I monitor operations across modules?",
      answer:
        "Use the dashboard metrics + reports. Track appointment load, encounters, lab/pharmacy throughput and revenue. If something is off, drill down into the module list pages.",
      tags: ["reports", "dashboard"],
    },
    {
      question: "Can I export data?",
      answer:
        "Where enabled, exports may be available in Reports. Always follow data privacy policy before sharing exports externally.",
      tags: ["reports", "privacy"],
    },
    {
      question: "How do I set up wards and bed tracking?",
      answer:
        "Admins can configure wards, bed capacity and rules in the Wards module. Staff then assigns beds during patient management.",
      tags: ["wards", "admin"],
    },
    {
      question: "Why are staff seeing “not allowed” actions?",
      answer:
        "Check that their role is correct, they’re attached to the right facility, and their account is active. If the issue persists, review permissions configuration.",
      tags: ["permissions", "admin"],
    },
  ]);

  const frontdesk = qa("fx-frontdesk", [
    {
      question: "How do I create a new appointment for a patient?",
      answer:
        "Go to Appointments → New. Select patient, choose clinician/service, pick a time, then confirm. The appointment will appear in the list.",
      tags: ["appointments", "frontdesk"],
    },
    {
      question: "How do I check-in a patient?",
      answer:
        "Open the appointment details and use the “Check-in” action (where available). This updates status so clinicians can begin the workflow.",
      tags: ["appointments", "check-in"],
    },
    {
      question: "How do I register a new patient?",
      answer:
        "Go to Patients → New (or the relevant create flow). Enter patient details accurately, then save. You can then book appointments immediately.",
      tags: ["patients"],
    },
    {
      question: "How do I handle walk-in visits?",
      answer:
        "Create an appointment or visit entry for the patient and check them in. Follow your facility’s SOP for triage/vitals before clinician review.",
      tags: ["frontdesk"],
    },
    {
      question: "How do I collect and record payments?",
      answer:
        "Go to Billing/Payments and use “Record payment” (where available). Ensure you select the correct patient, invoice, and payment method.",
      tags: ["billing", "payments"],
    },
    {
      question: "Why can’t I see some clinical modules?",
      answer:
        "Front desk access is usually limited to appointments, patient management and billing. Clinicians and lab/pharmacy have separate workflows.",
      tags: ["permissions"],
    },
    {
      question: "How do I manage dependents for a patient?",
      answer:
        "Open the patient profile and use the dependents section (where enabled). Ensure relationships and details are correct before booking for a dependent.",
      tags: ["patients"],
    },
    {
      question: "What do I do if a patient says they didn’t receive a notification?",
      answer:
        "Confirm the patient’s email/phone in their profile, confirm the action occurred (e.g., appointment created), and ask them to check spam. Escalate to admin if needed.",
      tags: ["notifications"],
    },
    {
      question: "How do I handle appointment rescheduling?",
      answer:
        "Open the appointment and choose reschedule. Confirm clinician availability and update the time. Inform the patient of the new schedule.",
      tags: ["appointments"],
    },
  ]);

  const doctor = qa("fx-doctor", [
    {
      question: "How do I start an encounter from an appointment?",
      answer:
        "Open the appointment and use “Start Encounter” (where available). This creates an encounter record and opens the workflow.",
      tags: ["encounters"],
    },
    {
      question: "How do I write SOAP notes and clinical documentation?",
      answer:
        "Inside an encounter workflow, fill the SOAP sections (Subjective, Objective, Assessment, Plan). Save as you go to avoid losing data.",
      tags: ["encounters", "soap"],
    },
    {
      question: "How do I request labs or imaging during an encounter?",
      answer:
        "Within the encounter workflow, open Labs or Imaging, select tests, add clinical notes, and submit. The lab/imaging team will receive the order.",
      tags: ["labs", "imaging"],
    },
    {
      question: "How do I prescribe drugs?",
      answer:
        "Open the Prescription step in the encounter workflow or Pharmacy module. Select drugs, dosage, duration, and instructions, then submit to pharmacy.",
      tags: ["pharmacy"],
    },
    {
      question: "How do I view a patient’s history?",
      answer:
        "From the patient profile, review encounters, vitals, labs, imaging and documents. Use the filters (where available) to focus on relevant timeframes.",
      tags: ["patients", "history"],
    },
    {
      question: "What do I do if I can’t see a patient record?",
      answer:
        "Confirm the patient is registered under your facility and you’re in the correct facility workspace. If it persists, your admin may need to adjust access.",
      tags: ["permissions"],
    },
    {
      question: "How do I collaborate with nurses or lab/pharmacy?",
      answer:
        "Use clear clinical notes in orders, and ensure requests include relevant context. Notifications and status updates help other teams process your requests.",
      tags: ["workflow"],
    },
    {
      question: "How do I handle follow-up plans and referrals?",
      answer:
        "Document follow-up instructions in the Plan section and schedule follow-up appointments if needed. Use your facility’s referral workflow where applicable.",
      tags: ["encounters"],
    },
    {
      question: "Why is a lab order marked as cancelled?",
      answer:
        "Orders can be cancelled by permitted roles (lab/admin) based on facility policy. Check the order notes for the cancellation reason.",
      tags: ["labs"],
    },
  ]);

  const nurse = qa("fx-nurse", [
    {
      question: "Where do I record patient vitals?",
      answer:
        "Use the Vitals module or the encounter workflow vitals step. Record values carefully and confirm the timestamp.",
      tags: ["vitals"],
    },
    {
      question: "How do I triage patients?",
      answer:
        "Start with vitals and notes, then ensure the patient is checked-in for the appointment. Document key observations for the clinician.",
      tags: ["triage"],
    },
    {
      question: "Can I start an encounter?",
      answer:
        "Depending on facility configuration, nurses may be able to initiate parts of the workflow. If “Start Encounter” is unavailable, the clinician/admin role controls it.",
      tags: ["encounters"],
    },
    {
      question: "How do I see my assigned work for the day?",
      answer:
        "Your dashboard and appointments/encounters lists show items relevant to your role. Check Notifications for workflow prompts.",
      tags: ["dashboard"],
    },
    {
      question: "What if a patient’s vitals are abnormal?",
      answer:
        "Follow facility SOP: repeat measurement if needed, document correctly, and escalate to the clinician promptly.",
      tags: ["vitals", "safety"],
    },
    {
      question: "How do I add nursing notes?",
      answer:
        "Use the notes/encounter sections available to your role. Keep notes objective and time-stamped.",
      tags: ["notes"],
    },
    {
      question: "Why can’t I see billing modules?",
      answer:
        "Billing access is role-based and is typically reserved for admins/front desk. If you need access, request it from the facility admin.",
      tags: ["permissions"],
    },
  ]);

  const lab = qa("fx-lab", [
    {
      question: "Where do I see incoming lab orders?",
      answer:
        "Go to Labs → Orders. You’ll see pending and in-progress items. Open an order to view test details and clinician notes.",
      tags: ["labs"],
    },
    {
      question: "How do I upload results and attachments?",
      answer:
        "Open the lab order, enter result values (if required) and upload attachments (PDF/images). Mark the order completed when final.",
      tags: ["labs", "attachments"],
    },
    {
      question: "What is “Outsource to independent lab” used for?",
      answer:
        "If your facility collaborates with an independent lab, orders can be routed externally. Ensure patient details and test selection are correct before outsourcing.",
      tags: ["labs", "outsourcing"],
    },
    {
      question: "How do I cancel a lab order?",
      answer:
        "If you have permission, open the order and choose cancel, then provide a reason. Cancelled orders should include clear notes for clinicians.",
      tags: ["labs"],
    },
    {
      question: "Why can’t I edit a completed result?",
      answer:
        "Completed records may be locked for integrity. Follow your facility’s correction process (e.g., addendum or supervisor approval).",
      tags: ["compliance"],
    },
    {
      question: "How do I handle sample issues (insufficient/contaminated)?",
      answer:
        "Cancel or flag the order (based on your workflow) and add a clear reason. Notify the clinician so a new sample can be requested.",
      tags: ["labs", "workflow"],
    },
    {
      question: "Can patients see results immediately?",
      answer:
        "Patients see results after you mark the order completed and the report is published. Ensure results are verified before publishing.",
      tags: ["labs"],
    },
  ]);

  const pharmacy = qa("fx-pharmacy", [
    {
      question: "Where do I see prescriptions from clinicians?",
      answer:
        "Go to Pharmacy. Prescriptions appear with patient details and dosage instructions. Open a prescription to dispense.",
      tags: ["pharmacy"],
    },
    {
      question: "How do I dispense and record fulfilment?",
      answer:
        "Open the prescription, confirm items and quantity, then mark as dispensed/fulfilled. Add notes for substitutions or stock issues.",
      tags: ["pharmacy", "workflow"],
    },
    {
      question: "How do I manage stock/catalog (if enabled)?",
      answer:
        "Use the Pharmacy catalog/stock pages to manage available drugs and quantities. Keep stock updated to reduce dispensing errors.",
      tags: ["stock"],
    },
    {
      question: "What if a drug is out of stock?",
      answer:
        "Add a note on the prescription and escalate to the clinician for alternatives, or handle substitution according to facility policy.",
      tags: ["pharmacy"],
    },
    {
      question: "Can I see a patient’s allergies?",
      answer:
        "If your role has access, review allergies on the patient record before dispensing. If allergies are missing, request confirmation from the clinician/patient.",
      tags: ["safety"],
    },
    {
      question: "How do I handle controlled medications?",
      answer:
        "Follow your facility policy and applicable regulations. Ensure prescriptions are valid and documentation is complete before dispensing.",
      tags: ["compliance"],
    },
    {
      question: "Why can’t I edit a prescription?",
      answer:
        "Prescriptions are clinician-authoritative records. Pharmacies typically record fulfilment and notes but cannot change the clinician’s order without a new prescription.",
      tags: ["permissions"],
    },
  ]);

  // Compose role-aware categories
  const categories = [
    cat("basics", "Basics", "Facility portal overview and navigation.", common),
  ];

  if (["SUPER_ADMIN", "ADMIN"].includes(r)) {
    categories.push(
      cat(
        "admin",
        "Admin & operations",
        "Staff management, permissions and oversight.",
        adminOwner
      )
    );
  }

  if (r === "FRONTDESK") {
    categories.push(
      cat(
        "frontdesk",
        "Front desk workflows",
        "Appointments, check-ins and patient flow.",
        frontdesk
      )
    );
  }

  if (r === "DOCTOR") {
    categories.push(
      cat(
        "doctor",
        "Doctor workflows",
        "Encounters, orders and prescriptions.",
        doctor
      )
    );
  }

  if (r === "NURSE") {
    categories.push(
      cat("nurse", "Nursing workflows", "Vitals, triage and support.", nurse)
    );
  }

  if (r === "LAB") {
    categories.push(
      cat("lab", "Lab workflows", "Orders, results and attachments.", lab)
    );
  }

  if (r === "PHARMACY") {
    categories.push(
      cat(
        "pharmacy",
        "Pharmacy workflows",
        "Dispensing, stock and fulfilment.",
        pharmacy
      )
    );
  }

  return {
    title: "Facility Help & FAQ",
    subtitle:
      "Help articles for facility staff",
    portalLabel: "Facility portal",
    backHref: "/facility",
    roleLabel: roleLabel(r),
    categories,
  };
}

/**
 * INDEPENDENT PROVIDER FAQ (role-aware)
 */
export function getProviderFaq(role) {
  const r = String(role || "").toUpperCase();

  const common = qa("px-common", [
    {
      question: "What is the Independent Provider portal?",
      answer:
        "The Provider portal is for independent (solo) providers — doctors, labs and pharmacies — to manage their own appointments, patient interactions, orders, and workflow items.",
      tags: ["overview"],
    },
    {
      question: "Why can’t I access the Facility portal?",
      answer:
        "If you’re not attached to a facility staff account, you should use the Provider portal. Facility staff have a separate workspace with facility-scoped permissions.",
      tags: ["login", "security"],
    },
    {
      question: "How do I see my patients?",
      answer:
        "Go to Patients. You’ll see patients that have booked you directly or have been routed to you through NIEMR workflows.",
      tags: ["patients"],
    },
    {
      question: "How do I view notifications?",
      answer:
        "Open Notifications from your dashboard quick buttons. Notifications highlight new orders, appointment updates, and system messages.",
      tags: ["notifications"],
    },
    {
      question: "How do I keep my provider profile accurate?",
      answer:
        "Update Settings/Profile with your correct service details. Your discoverability and trust depends on accurate information.",
      tags: ["profile"],
    },
    {
      question: "What does “permission denied” mean here?",
      answer:
        "It can mean the record is not yours, you are using the wrong portal, or your session expired. Confirm you’re logged in as an Independent Provider.",
      tags: ["permissions"],
    },
    {
      question: "Can I work with facilities as an independent provider?",
      answer:
        "Yes. Some workflows allow facility staff to route orders to independent labs/pharmacies (when configured). Your portal will show those requests.",
      tags: ["collaboration"],
    },
    {
      question: "How do I handle data privacy?",
      answer:
        "Only access patient records needed for care delivery. Don’t share screenshots externally. Always log out on shared devices.",
      tags: ["privacy"],
    },
    {
      question: "How do I reset my password?",
      answer:
        "Use “Forgot password” on the Provider login page. If you don’t get a reset email, check spam and confirm your email address.",
      tags: ["password"],
    },
    {
      question: "Where do I see my billing and payments?",
      answer:
        "Use the Billing and Payments sections (where enabled). Depending on your setup, you may record payments or see service revenue.",
      tags: ["billing", "payments"],
    },
    {
      question: "How do I report a system issue?",
      answer:
        "Take a screenshot of the error and note what you were doing. Share it with NIEMR support at niemr.ai@outlook.com.",
      tags: ["support"],
    },
    {
      question: "Why is my profile showing as incomplete?",
      answer:
        "Some dashboards warn when key profile fields are missing. Update Settings/Profile and refresh. If it persists, contact support.",
      tags: ["profile"],
    },
    {
      question: "Do patients see my results/prescriptions immediately?",
      answer:
        "Patients see completed items after you submit/mark them completed and any attachments are uploaded. Verify accuracy before publishing.",
      tags: ["workflow"],
    },
  ]);

  const doctor = qa("px-doc", [
    {
      question: "How do I manage my appointments as an independent doctor?",
      answer:
        "Use Appointments to view upcoming bookings. Open an appointment to see patient details and prepare for the visit.",
      tags: ["appointments"],
    },
    {
      question: "How do I create an encounter and write notes?",
      answer:
        "Open an appointment (or encounter list) and start the encounter workflow. Fill SOAP notes, add diagnoses, and document the plan.",
      tags: ["encounters", "soap"],
    },
    {
      question: "How do I request lab tests or imaging for a patient?",
      answer:
        "Within the encounter workflow, select labs/imaging and submit. If routed to an independent lab, you’ll see the status updates.",
      tags: ["labs", "imaging"],
    },
    {
      question: "How do I prescribe medications?",
      answer:
        "Use the Pharmacy workflow to create a prescription with drug name, dosage, duration and instructions. The patient can view it in their portal.",
      tags: ["pharmacy"],
    },
    {
      question: "How do I follow up with a patient?",
      answer:
        "Document follow-up instructions in the plan and schedule another appointment if needed. Keep notes clear for continuity.",
      tags: ["encounters"],
    },
    {
      question: "Why can’t I see some facility-scoped records?",
      answer:
        "Independent providers only access records shared through NIEMR workflows or those created in your portal. Facility-only records may not be visible.",
      tags: ["permissions"],
    },
    {
      question: "How do I handle cancellations?",
      answer:
        "If cancellation is allowed, open the appointment and cancel/reschedule. Add a note if necessary so the patient understands next steps.",
      tags: ["appointments"],
    },
    {
      question: "Can I view a patient’s lab history?",
      answer:
        "If your role has access, open the patient profile and check labs/encounters history to make better decisions.",
      tags: ["patients"],
    },
  ]);

  const nurse = qa("px-nurse", [
    {
      question: "How do I record vitals for a patient?",
      answer:
        "Go to Vitals or use the encounter workflow vitals step. Record readings carefully and save.",
      tags: ["vitals"],
    },
    {
      question: "How do I support doctors in patient workflow?",
      answer:
        "Record vitals, triage notes, and ensure appointments are in the correct status. Add clear notes for the clinician.",
      tags: ["workflow"],
    },
    {
      question: "What do I do when vitals are abnormal?",
      answer:
        "Follow SOP: repeat measurement if needed, record accurately, and escalate to the clinician promptly.",
      tags: ["safety"],
    },
    {
      question: "Why do I not see billing options?",
      answer:
        "Billing access is role-based. If you need billing access for your workflow, request it from your organisation admin.",
      tags: ["permissions"],
    },
    {
      question: "How do I find a patient quickly?",
      answer:
        "Use Patients and search by name/phone/ID. Open the patient profile to view history.",
      tags: ["patients"],
    },
    {
      question: "Can I start an encounter?",
      answer:
        "Depending on configuration, you may support parts of the workflow. If you cannot start an encounter, the doctor/admin role controls it.",
      tags: ["encounters"],
    },
    {
      question: "How do I update nursing notes?",
      answer:
        "Use available notes sections in the workflow. Keep notes objective and time-stamped.",
      tags: ["notes"],
    },
  ]);

  const lab = qa("px-lab", [
    {
      question: "Where do I see lab orders assigned to my lab?",
      answer:
        "Go to Provider Labs → Orders. Open an order to view requested tests and any clinician notes.",
      tags: ["labs"],
    },
    {
      question: "How do I complete an order and upload results?",
      answer:
        "Open the order, enter results (if applicable), upload attachments, then mark completed. Double-check before publishing.",
      tags: ["labs", "attachments"],
    },
    {
      question: "Can I create lab orders manually?",
      answer:
        "If enabled, you can create lab orders from your portal (e.g., walk-in customers) and either pick from catalog or enter details.",
      tags: ["labs"],
    },
    {
      question: "How do cancellations work?",
      answer:
        "If cancellation is allowed, open the order and cancel with a reason (sample issues, patient no-show, etc.).",
      tags: ["labs"],
    },
    {
      question: "Why can’t I edit a completed result?",
      answer:
        "Completed results may be locked for integrity. Follow your correction policy (addendum/supervisor review) instead of editing directly.",
      tags: ["compliance"],
    },
    {
      question: "How do I ensure patients can access results?",
      answer:
        "Mark the order completed and attach the report file. Patients will see it in their Labs section.",
      tags: ["workflow"],
    },
    {
      question: "What if I received an order that is missing details?",
      answer:
        "Check clinician notes and patient details. If still unclear, contact the requesting clinician/facility through your admin/support channel.",
      tags: ["workflow"],
    },
  ]);

  const pharmacy = qa("px-pharm", [
    {
      question: "Where do I see medication requests/prescriptions?",
      answer:
        "Go to Provider Pharmacy. Open a prescription to view items, dosage and notes.",
      tags: ["pharmacy"],
    },
    {
      question: "How do I dispense a prescription?",
      answer:
        "Open the prescription, confirm items and quantity, then mark as dispensed/fulfilled. Add notes for substitutions.",
      tags: ["pharmacy"],
    },
    {
      question: "Can I manage my drug catalog/stock?",
      answer:
        "Use the Pharmacy catalog/stock pages to update available drugs and quantities. Keeping stock accurate reduces delays.",
      tags: ["stock"],
    },
    {
      question: "What if a drug is out of stock?",
      answer:
        "Add a note and communicate alternatives (per policy). If a new prescription is needed, advise the clinician/patient.",
      tags: ["pharmacy"],
    },
    {
      question: "Why can’t I change the drug or dosage?",
      answer:
        "Prescriptions are clinician orders. You typically record fulfilment and notes. For changes, a clinician should issue a corrected prescription.",
      tags: ["permissions"],
    },
    {
      question: "How do I handle controlled medications?",
      answer:
        "Follow regulations and your policy: verify prescription validity and document appropriately before dispensing.",
      tags: ["compliance"],
    },
    {
      question: "Can patients see my dispensing updates?",
      answer:
        "Yes. When you mark the prescription fulfilled/dispensed, the patient’s portal reflects the updated status.",
      tags: ["workflow"],
    },
  ]);

  const categories = [
    cat("basics", "Basics", "Provider portal overview and navigation.", common),
  ];

  if (r === "DOCTOR") {
    categories.push(cat("doctor", "Doctor workflows", "Encounters and prescriptions.", doctor));
  }
  if (r === "NURSE") {
    categories.push(cat("nurse", "Nursing workflows", "Vitals and triage.", nurse));
  }
  if (r === "LAB") {
    categories.push(cat("lab", "Lab workflows", "Orders and results.", lab));
  }
  if (r === "PHARMACY") {
    categories.push(cat("pharmacy", "Pharmacy workflows", "Dispensing and stock.", pharmacy));
  }

  return {
    title: "Solo Practioner Help & FAQ",
    subtitle: "Guidance for providers using NIEMR.",
    portalLabel: "Independent provider portal",
    backHref: "/provider",
    roleLabel: roleLabel(r),
    categories,
  };
}

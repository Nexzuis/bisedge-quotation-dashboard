/**
 * Default Cover Letter Template
 */

export const defaultCoverLetterTemplate = {
  salutation: 'Dear {contactPerson},',

  paragraphs: [
    'Thank you for your enquiry regarding forklift rental solutions. We are pleased to present this comprehensive quotation for your material handling requirements.',

    'This quotation includes {unitCount} unit(s) with a total monthly rental of {totalMonthly}, over a lease term of {leaseTerm} months. The total contract value amounts to {totalContractValue}. All equipment is backed by Linde\'s industry-leading quality and Bisedge\'s exceptional local service and support.',

    'We are confident that this solution will meet your operational needs and deliver excellent value. Should you have any questions or require further clarification, please do not hesitate to contact us. We look forward to partnering with you and supporting your business success.',
  ],

  closing: 'Yours sincerely,',

  signature: {
    name: '{signatoryName}',
    title: '{signatoryTitle}',
    company: 'Bisedge South Africa (Pty) Ltd',
  },

  footer: {
    company: 'Bisedge South Africa (Pty) Ltd',
    address: [
      '123 Industrial Avenue',
      'Johannesburg, 2001',
      'South Africa',
    ],
    phone: '+27 11 123 4567',
    email: 'quotes@bisedge.co.za',
    website: 'www.bisedge.co.za',
  },
};

/**
 * Replace template placeholders with actual values
 */
export function fillCoverLetterTemplate(
  template: typeof defaultCoverLetterTemplate,
  data: {
    contactPerson: string;
    unitCount: number;
    totalMonthly: string;
    leaseTerm: number;
    totalContractValue: string;
    signatoryName: string;
    signatoryTitle: string;
  }
): typeof defaultCoverLetterTemplate {
  const filled = JSON.parse(JSON.stringify(template)); // Deep clone

  // Replace salutation
  filled.salutation = filled.salutation.replace('{contactPerson}', data.contactPerson);

  // Replace paragraphs
  filled.paragraphs = filled.paragraphs.map((p: string) =>
    p
      .replace('{unitCount}', data.unitCount.toString())
      .replace('{totalMonthly}', data.totalMonthly)
      .replace('{leaseTerm}', data.leaseTerm.toString())
      .replace('{totalContractValue}', data.totalContractValue)
  );

  // Replace signature
  filled.signature.name = filled.signature.name.replace('{signatoryName}', data.signatoryName);
  filled.signature.title = filled.signature.title.replace('{signatoryTitle}', data.signatoryTitle);

  return filled;
}

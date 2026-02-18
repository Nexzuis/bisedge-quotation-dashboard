import type { TermsTemplate } from '../types';

/**
 * Default Terms & Conditions Template for Rental Agreements
 */
export const defaultTermsTemplate: TermsTemplate = {
  title: 'Terms & Conditions - Forklift Rental Agreement',
  sections: [
    {
      number: '1',
      title: 'Definitions',
      content: [
        '"Agreement" means this rental agreement and quotation document.',
        '"Equipment" means the forklift(s), battery(ies), and attachments as specified in the quotation.',
        '"Rental Period" means the lease term as specified in the quotation.',
        '"Monthly Rental" means the monthly rental fee as specified in the quotation.',
        '"Customer" means the party named in the quotation as the client.',
        '"Bisedge" means Bisedge South Africa (Pty) Ltd, the authorized Linde dealer.',
      ],
    },
    {
      number: '2',
      title: 'Scope of Agreement',
      content: [
        'Bisedge agrees to lease the Equipment to the Customer for the Rental Period.',
        'The Equipment remains the property of Bisedge at all times.',
        'The Customer shall use the Equipment solely for its intended purpose and in accordance with manufacturer guidelines.',
        'The Customer shall not sub-lease, transfer, or allow third parties to use the Equipment without written consent from Bisedge.',
      ],
    },
    {
      number: '3',
      title: 'Payment Terms',
      content: [
        'Monthly rental fees are payable in advance on the first day of each month.',
        'Payment is due within 30 days of invoice date.',
        'Late payments will incur interest at the rate of prime plus 2% per annum.',
        'All prices are exclusive of VAT unless stated otherwise.',
        'Bisedge reserves the right to adjust rental rates annually based on CPI or as agreed.',
      ],
    },
    {
      number: '4',
      title: 'Maintenance & Service',
      content: [
        'Bisedge will provide scheduled preventive maintenance as included in the rental agreement.',
        'The Customer must report any defects or malfunctions immediately to Bisedge.',
        'Bisedge will repair or replace defective Equipment at no additional cost, except where damage is caused by misuse or negligence.',
        'The Customer is responsible for daily inspections and basic maintenance (e.g., battery charging, cleaning).',
        'Maintenance costs are included in the monthly rental unless otherwise specified.',
      ],
    },
    {
      number: '5',
      title: 'Insurance Requirements',
      content: [
        'The Customer must maintain comprehensive insurance covering the Equipment against loss, theft, and damage.',
        'Insurance must name Bisedge as an interested party.',
        'The Customer must provide proof of insurance within 7 days of agreement commencement.',
        'If the Customer fails to maintain insurance, Bisedge may arrange insurance and charge the Customer accordingly.',
      ],
    },
    {
      number: '6',
      title: 'Termination',
      content: [
        'Early termination by the Customer is subject to a penalty equal to 3 months rental or the remaining rental period, whichever is less.',
        'Bisedge may terminate this Agreement immediately if the Customer breaches any term herein.',
        'Upon termination, the Customer must return the Equipment in good working condition, subject to normal wear and tear.',
        'The Customer is liable for any damage beyond normal wear and tear.',
        'Outstanding rental fees must be paid in full upon termination.',
      ],
    },
    {
      number: '7',
      title: 'Liability & Indemnity',
      content: [
        'The Customer assumes all risk of loss or damage to the Equipment while in their possession.',
        'The Customer indemnifies Bisedge against all claims, losses, and damages arising from the use of the Equipment.',
        'Bisedge is not liable for any consequential, indirect, or incidental damages.',
        'Bisedge\'s maximum liability is limited to the value of the Equipment.',
        'The Customer is responsible for compliance with all health and safety regulations.',
      ],
    },
    {
      number: '8',
      title: 'General Provisions',
      content: [
        'This Agreement is governed by the laws of South Africa.',
        'Any disputes shall be resolved through arbitration in accordance with South African law.',
        'This quotation is valid for 30 days from the issue date.',
        'Acceptance of this quotation is subject to credit approval by Bisedge.',
        'Bisedge reserves the right to adjust pricing based on currency fluctuations (EUR/ZAR exchange rate).',
        'Force majeure events shall excuse both parties from performance obligations.',
        'No amendments to this Agreement are valid unless made in writing and signed by both parties.',
      ],
    },
  ],
  footer:
    'These terms and conditions govern the rental of material handling equipment from Bisedge South Africa (Pty) Ltd. By accepting this quotation, the Customer agrees to be bound by these terms.',
};

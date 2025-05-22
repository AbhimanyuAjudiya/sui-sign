export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How does this app ensure document security?",
    answer: "We use Sui blockchain to store signature metadata and Walrus decentralized storage to store documents immutably. This makes all data tamper-proof, auditable, and censorship-resistant.",
  },
  {
    question: "Who pays for the agreement fees?",
    answer: "By default, the signer (recipient) pays the agreement fee. However, the sender has an option to cover this fee on behalf of the signer.",
  },
  {
    question: "Can I preview the document before signing?",
    answer: "Yes, every signer can preview the document and see designated sign areas. They can either draw or upload their signature.",
  },
  {
    question: "Do signers need a crypto wallet?",
    answer: "No. We use zkLogin (powered by Sui) so signers can authenticate using familiar Web2 accounts like Google, while all interactions are still on-chain.",
  },
  {
    question: "Can public agreements be browsed?",
    answer: "Yes. If the sender marks the agreement as public, it will appear in the public dashboard and landing page as discoverable and transparent proof.",
  },
];

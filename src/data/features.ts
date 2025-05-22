import { BriefcaseIcon, CheckCircleIcon, DatabaseIcon, LayoutDashboardIcon, LockIcon, WalletIcon } from 'lucide-react';

export interface Feature {
  title: string;
  description: string;
  icon: typeof BriefcaseIcon;
}

export const features: Feature[] = [
  {
    title: 'Decentralized Document Storage',
    description: 'Store agreements on Walrus decentralized storage, ensuring they are immutable.',
    icon: DatabaseIcon,
  },
  {
    title: 'Multi-Signature Verification',
    description: 'Supports multiple signers per agreement. Each signature is cryptographically verified and stored on-chain.',
    icon: CheckCircleIcon,
  },
  {
    title: 'Dynamic Agreement Fees',
    description: 'Fees are calculated based on signers and storage needs. Paid by signer by default, with flexibility for sender override.',
    icon: WalletIcon,
  },
  {
    title: 'Signer-Friendly Workflow',
    description: 'Designated signature areas, draw or upload options, and intuitive UI for frictionless signing.',
    icon: LayoutDashboardIcon,
  },
  {
    title: 'Public Agreement Explorer',
    description: 'Explore globally visible agreements and track recently signed documents directly from the landing page.',
    icon: LockIcon,
  },
  {
    title: 'Decentralized and zkLogin-Powered',
    description: 'Fully decentralized, Web3-native app with zkLogin enabling Gmail-based login without sacrificing decentralization.',
    icon: BriefcaseIcon,
  },
];

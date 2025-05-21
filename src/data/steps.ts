import { FileTextIcon, SendIcon, ShieldCheckIcon, UserCheckIcon } from 'lucide-react';

export interface Step {
  title: string;
  description: string;
  icon: typeof FileTextIcon;
}

export const steps: Step[] = [
  {
    title: "Upload or Select Draft",
    description: "Choose a previously saved draft or upload a new PDF file. You can also mark it public if desired.",
    icon: FileTextIcon,
  },
  {
    title: "Define Sign Areas & Add Signers",
    description: "Place sign areas in the PDF and specify signer addresses or emails. Add multiple signers if needed.",
    icon: UserCheckIcon,
  },
  {
    title: "Send & Pay Agreement Fee",
    description: "Senders or signers pay the agreement fee which covers gas and storage. Secure links are generated.",
    icon: SendIcon,
  },
  {
    title: "Signer Reviews & Signs",
    description: "Signer views document, places their signature in marked areas, and confirms on-chain signing.",
    icon: ShieldCheckIcon,
  },
];

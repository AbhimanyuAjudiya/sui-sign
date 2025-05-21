export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}

export const testimonials: Testimonial[] = [
  {
    quote: "SuiSign has revolutionized our contract signing process. We've cut processing time by 80% while enhancing security and compliance.",
    author: "Elena Martinez",
    role: "Chief Legal Officer",
    company: "NexusDAO",
  },
  {
    quote: "As a startup juggling multiple agreements with investors, SuiSign's intuitive platform has become indispensable to our operations.",
    author: "Michael Chen",
    role: "Founder & CEO",
    company: "BlockFusion",
  },
  {
    quote: "The immutable nature of SuiSign gives us confidence that our legal agreements are tamper-proof and permanently accessible.",
    author: "Sarah Johnson",
    role: "Operations Director",
    company: "LegalTech Partners",
  },
  {
    quote: "We've integrated SuiSign into our governance framework. Now our DAO members can vote and sign proposals in one seamless experience.",
    author: "Jamal Washington",
    role: "Governance Lead",
    company: "MetaCollective",
  },
];
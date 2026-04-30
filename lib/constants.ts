export interface Event {
  image: string;
  title: string;
  slug: string;
  location: string;
  date: string;
  time: string;
}

export const events: Event[] = [
  {
    image: "/images/event1.png",
    title: "React Conf 2025",
    slug: "react-conf-2025",
    location: "San Francisco, CA",
    date: "June 15, 2025",
    time: "9:00 AM - 6:00 PM",
  },
  {
    image: "/images/event2.png",
    title: "Next.js Global Summit",
    slug: "nextjs-global-summit",
    location: "London, UK",
    date: "July 22, 2025",
    time: "10:00 AM - 5:00 PM",
  },
  {
    image: "/images/event3.png",
    title: "TypeScript Congress",
    slug: "typescript-congress",
    location: "Berlin, Germany",
    date: "August 8, 2025",
    time: "9:30 AM - 4:30 PM",
  },
  {
    image: "/images/event4.png",
    title: "AI Dev Hackathon",
    slug: "ai-dev-hackathon",
    location: "New York, NY",
    date: "September 5-7, 2025",
    time: "24-Hour Event",
  },
  {
    image: "/images/event5.png",
    title: "Rust Global Conference",
    slug: "rust-global-conference",
    location: "Toronto, Canada",
    date: "October 12, 2025",
    time: "8:00 AM - 7:00 PM",
  },
  {
    image: "/images/event6.png",
    title: "DevOps Days Chicago",
    slug: "devops-days-chicago",
    location: "Chicago, IL",
    date: "November 3-4, 2025",
    time: "9:00 AM - 5:00 PM",
  },
  {
    image: "/images/event1.png",
    title: "Vercel Ship",
    slug: "vercel-ship",
    location: "San Jose, CA",
    date: "December 10, 2025",
    time: "10:00 AM - 6:00 PM",
  },
  {
    image: "/images/event2.png",
    title: "Node.js Conference Asia",
    slug: "nodejs-conference-asia",
    location: "Singapore",
    date: "January 18, 2026",
    time: "9:00 AM - 5:00 PM",
  },
];

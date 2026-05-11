import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { IEvent } from "@/database/event.model";
import { cacheLife } from "next/cache";

import React from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const Page = async () => {
  // "use cache";
  // cacheLife("hours");
  let events: IEvent[] = [];

  if (!BASE_URL) {
    console.error("NEXT_PUBLIC_BASE_URL is not defined");
  } else {
    try {
      // Use the internal API route and allow Next.js to cache the fetch.
      // This avoids the blocking-route warning about uncached data/connection outside Suspense.
      const response = await fetch(`${BASE_URL}/api/events`, {
        cache: "force-cache",
      });
      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          // ignore
        }
        throw new Error(
          `HTTP error! status: ${response.status}. Response: ${JSON.stringify(body)}`,
        );
      }
      const data = await response.json();
      if (data && Array.isArray(data.events)) {
        events = data.events;
      } else {
        console.warn(
          "Invalid response format: missing or invalid events property",
        );
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev <br /> Event You Can&apos;t Miss
      </h1>
      <p className="text-center mt-5">
        Hackathons, Meetups and Conferences, All in One Place
      </p>

      <ExploreBtn />

      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>

        <ul className="events">
          {events &&
            events.length > 0 &&
            events.map((event: IEvent) => (
              <li key={event.title} className="list-none">
                <EventCard {...event} slug={event.slug || ""} />
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};

export default Page;

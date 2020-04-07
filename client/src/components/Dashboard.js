import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';

export default function Dashboard(props) {
  const [dashboard, setDashboard] = useState({
    tags: [],
    articles: [],
    books: [],
    people: [],
    points: [],
    ideas: []
  });

  useEffect(() => {
    function fetchDashboard() {
      console.log("fetchdashboard function");

      const url = `/api/dashboard`;
      Net.get(url).then(db => {
        if (db) {
          console.log(db);
          setDashboard(db);
        } else {
          console.error("Dashboard error");
        }
      });
    };

    fetchDashboard();
  }, []);

  return (
    <article>
      <h1>Dashboard</h1>
      <section>
        <h2>Recent Ideas</h2>
        <ol>
          { buildLinkBacks(dashboard.ideas) }
        </ol>
      </section>
      <section>
        <h2>Recent Tags</h2>
        <ol>
          { buildLinkBacks(dashboard.tags) }
        </ol>
      </section>
      <section>
        <h2>Recent Articles</h2>
        <ol>
          { buildLinkBacks(dashboard.articles) }
        </ol>
      </section>
      <section>
        <h2>Recent Books</h2>
        <ol>
          { buildLinkBacks(dashboard.books) }
        </ol>
      </section>
      <section>
        <h2>Recent People</h2>
        <ol>
          { buildLinkBacks(dashboard.people) }
        </ol>
      </section>
      <section>
        <h2>Recent Points</h2>
        <ol>
          { buildLinkBacks(dashboard.points) }
        </ol>
      </section>
    </article>
  );
}



function buildLinkBacks(lbs) {
  return lbs.map(
    lb => <ListingLink id={ lb.id } key={ lb.id } name={ lb.name } resource={ lb.resource }/>
  );
}
